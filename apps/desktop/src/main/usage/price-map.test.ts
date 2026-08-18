import { writeFile } from 'node:fs/promises';
import { describe, expect, test, vi } from 'vitest';

import {
  aMapOver,
  aPricingClock,
  aPricingHome,
  miniPriced,
  neverFetches,
  NOW,
} from './price-map.testkit';

aPricingClock();

describe('where the prices come from', () => {
  test('a first boot offline prices from the bundle and says so', async () => {
    const map = await aMapOver(await aPricingHome(), neverFetches);

    const { prices, provenance } = map.standing();

    expect(provenance).toEqual({ source: 'bundled' });
    expect(prices.get('claude-sonnet-4-5')?.inputPerToken).toBe(0.000003);
  });

  test('a standing cache beats the bundle and carries the instant it was fetched', async () => {
    const files = await aPricingHome();

    await writeFile(
      files.cacheFile,
      JSON.stringify({ schemaVersion: 1, fetchedAt: NOW - 3_600_000, payload: miniPriced }),
    );

    const map = await aMapOver(files, neverFetches);

    expect(map.standing().provenance).toEqual({ source: 'synced', fetchedAt: NOW - 3_600_000 });
    expect(map.standing().prices.get('gpt-5-mini')).toBeDefined();
    expect(map.standing().prices.get('claude-sonnet-4-5')).toBeUndefined();
  });

  test('a refresh swaps the standing copy and writes the cache down', async () => {
    const files = await aPricingHome();
    const map = await aMapOver(files, async () => Promise.resolve(miniPriced));

    await map.refreshNow();

    expect(map.standing().provenance).toEqual({ source: 'synced', fetchedAt: NOW });
    expect(map.standing().prices.get('gpt-5-mini')?.outputPerToken).toBe(0.000002);

    const reopened = await aMapOver(files, neverFetches);

    expect(reopened.standing().provenance).toEqual({ source: 'synced', fetchedAt: NOW });
  });
});

describe('what a refresh can and cannot change', () => {
  test('a failed refresh keeps the standing copy and stamps nothing', async () => {
    const map = await aMapOver(await aPricingHome(), neverFetches);

    await map.refreshNow();

    expect(map.standing().provenance).toEqual({ source: 'bundled' });
    expect(map.standing().prices.get('claude-sonnet-4-5')).toBeDefined();
  });

  test('a payload that is not a price map refuses, and the standing copy keeps serving', async () => {
    const map = await aMapOver(await aPricingHome(), async () =>
      Promise.resolve('the shape moved'),
    );

    await map.refreshNow();

    expect(map.standing().provenance).toEqual({ source: 'bundled' });
  });

  test('an entry missing its two required rates is dropped rather than priced wrong', async () => {
    const map = await aMapOver(await aPricingHome(), async () =>
      Promise.resolve({
        ...miniPriced,
        'half-priced': { input_cost_per_token: 1e-7 },
        'oddly-shaped': { input_cost_per_token: 'free', output_cost_per_token: 0.000001 },
      }),
    );

    await map.refreshNow();

    expect(map.standing().prices.get('gpt-5-mini')).toBeDefined();
    expect(map.standing().prices.get('half-priced')).toBeUndefined();
    expect(map.standing().prices.get('oddly-shaped')).toBeUndefined();
  });

  test('the day-long timer refreshes on its own', async () => {
    const map = await aMapOver(await aPricingHome(), async () => Promise.resolve(miniPriced));

    await vi.advanceTimersByTimeAsync(24 * 3_600_000);

    expect(map.standing().provenance.source).toBe('synced');
  });
});

describe('the live fetch lane', () => {
  test('the default lane asks LiteLLM for the map and syncs what it answers', async () => {
    const asked: string[] = [];

    vi.stubGlobal('fetch', async (url: string | URL) => {
      asked.push(String(url));

      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => Promise.resolve(miniPriced),
      });
    });

    const map = await aMapOver(await aPricingHome());

    await map.refreshNow();

    expect(asked).toEqual([
      'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json',
    ]);
    expect(map.standing().provenance).toEqual({ source: 'synced', fetchedAt: NOW });
    expect(map.standing().prices.get('gpt-5-mini')?.inputPerToken).toBe(2.5e-7);
  });

  test('a lane that answers non-ok keeps the standing copy serving', async () => {
    vi.stubGlobal('fetch', async () => Promise.resolve({ ok: false, status: 502 }));

    const map = await aMapOver(await aPricingHome());

    await map.refreshNow();

    expect(map.standing().provenance).toEqual({ source: 'bundled' });
    expect(map.standing().prices.get('claude-sonnet-4-5')?.inputPerToken).toBe(0.000003);
  });
});

describe('what the price parser drops and refuses', () => {
  test('an entry that is not an object at all is dropped', async () => {
    const map = await aMapOver(await aPricingHome(), async () =>
      Promise.resolve({ ...miniPriced, 'a-note': 'not an entry' }),
    );

    await map.refreshNow();

    expect(map.standing().prices.get('gpt-5-mini')?.inputPerToken).toBe(2.5e-7);
    expect(map.standing().prices.get('a-note')).toBeUndefined();
  });

  test('a bundle whose shape moved still boots, pricing nothing', async () => {
    const files = await aPricingHome();

    await writeFile(files.bundledFile, JSON.stringify(['moved']));

    const map = await aMapOver(files, neverFetches);

    expect(map.standing().provenance).toEqual({ source: 'bundled' });
    expect(map.standing().prices.size).toBe(0);
  });
});
