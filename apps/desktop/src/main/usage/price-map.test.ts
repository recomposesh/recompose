import { mkdtemp, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { openPriceMap } from './price-map';

const NOW = 1_754_600_400_000;

const CORRUPT_SUFFIX = 'corrupt-2025-08-07T21-00-00.000Z';

const sonnetPriced = {
  'claude-sonnet-4-5': {
    input_cost_per_token: 0.000003,
    output_cost_per_token: 0.000015,
    cache_read_input_token_cost: 3e-7,
    cache_creation_input_token_cost: 0.00000375,
  },
};

const miniPriced = {
  'gpt-5-mini': { input_cost_per_token: 2.5e-7, output_cost_per_token: 0.000002 },
};

async function aPricingHome(): Promise<{ cacheFile: string; bundledFile: string }> {
  const home = await mkdtemp(join(tmpdir(), 'recompose-prices-'));
  const bundledFile = join(home, 'bundled-prices.json');

  await writeFile(bundledFile, JSON.stringify(sonnetPriced));

  return { cacheFile: join(home, 'prices.json'), bundledFile };
}

const neverFetches = async (): Promise<never> =>
  Promise.reject(new Error('the network is unreachable'));

let disposers: (() => void)[] = [];

async function aMapOver(
  files: { cacheFile: string; bundledFile: string },
  fetchPrices?: () => Promise<unknown>,
) {
  const map = await openPriceMap({
    ...files,
    ...(fetchPrices === undefined ? {} : { fetchPrices }),
  });

  disposers.push(map.dispose);

  return map;
}

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'],
  });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  for (const dispose of disposers) {
    dispose();
  }

  disposers = [];
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

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
      JSON.stringify({ fetchedAt: NOW - 3_600_000, payload: miniPriced }),
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

describe('what the cache can refuse', () => {
  test('a corrupt cache is moved aside and the boot falls back to the bundle', async () => {
    const files = await aPricingHome();

    await writeFile(files.cacheFile, '{ not json');

    const map = await aMapOver(files, neverFetches);

    expect(map.standing().provenance).toEqual({ source: 'bundled' });
    expect(await readdir(dirname(files.cacheFile))).toContain(`prices.json.${CORRUPT_SUFFIX}`);
  });

  test('a corrupt cache names its quarantined path to the caller', async () => {
    const files = await aPricingHome();
    const quarantined: string[] = [];

    await writeFile(files.cacheFile, '{ not json');

    const map = await openPriceMap({
      ...files,
      fetchPrices: neverFetches,
      onCorrupt: (path) => {
        quarantined.push(path);
      },
    });

    disposers.push(map.dispose);

    expect(quarantined).toEqual([`${files.cacheFile}.${CORRUPT_SUFFIX}`]);
    expect(map.standing().provenance).toEqual({ source: 'bundled' });
  });

  test('a cache whose fetch instant is fractional reads as no cache at all', async () => {
    const files = await aPricingHome();

    await writeFile(files.cacheFile, JSON.stringify({ fetchedAt: 12.5, payload: miniPriced }));

    const map = await aMapOver(files, neverFetches);

    expect(map.standing().provenance).toEqual({ source: 'bundled' });
  });

  test('a cache that never says when it was fetched reads as no cache at all', async () => {
    const files = await aPricingHome();

    await writeFile(files.cacheFile, JSON.stringify({ payload: miniPriced }));

    const map = await aMapOver(files, neverFetches);

    expect(map.standing().provenance).toEqual({ source: 'bundled' });
  });

  test('a cache whose payload moved shape reads as no cache at all', async () => {
    const files = await aPricingHome();

    await writeFile(files.cacheFile, JSON.stringify({ fetchedAt: NOW - 60_000, payload: 'moved' }));

    const map = await aMapOver(files, neverFetches);

    expect(map.standing().provenance).toEqual({ source: 'bundled' });
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
