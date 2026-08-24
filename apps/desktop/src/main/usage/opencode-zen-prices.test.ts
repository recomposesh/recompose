import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import type { ContextBandPrice } from './pricing';

import { openCodeZenPricesFrom } from './opencode-zen-prices';

const registry = {
  anthropic: { models: { 'claude-opus-5': { cost: { input: 5, output: 25 } } } },
  opencode: {
    models: {
      'gpt-5.5': { cost: { input: 5, output: 30, cache_read: 0.5 } },
      'claude-opus-5': { cost: { input: 5, output: 25, cache_read: 0.5, cache_write: 6.25 } },
      'big-pickle': { cost: { input: 0, output: 0, cache_read: 0 } },
      'a-model-with-no-price': { cost: { output: 4 } },
      'gemini-3.1-pro': {
        cost: {
          input: 2,
          output: 12,
          cache_read: 0.2,
          tiers: [
            { input: 4, output: 18, cache_read: 0.4, tier: { type: 'context', size: 200000 } },
          ],
        },
      },
      'a-model-tiered-by-something-else': {
        cost: {
          input: 1,
          output: 2,
          tiers: [{ input: 9, output: 9, tier: { type: 'batch', size: 10 } }],
        },
      },
    },
  },
};

describe('the prices the registry publishes for the gateway', () => {
  test('a rate stated per million tokens is held per token', () => {
    const prices = openCodeZenPricesFrom(registry);

    expect(prices?.get('opencode-zen/gpt-5.5')).toMatchObject({
      inputPerToken: 0.000005,
      outputPerToken: 0.00003,
      cacheReadPerToken: 5e-7,
    });
  });

  test('a model the gateway also caches writes carries both cache rates', () => {
    expect(openCodeZenPricesFrom(registry)?.get('opencode-zen/claude-opus-5')).toEqual({
      inputPerToken: 0.000005,
      outputPerToken: 0.000025,
      cacheReadPerToken: 5e-7,
      cacheWritePerToken: 0.00000625,
    });
  });

  test('a model the gateway serves free is priced at nothing, never dropped as unpriced', () => {
    expect(openCodeZenPricesFrom(registry)?.get('opencode-zen/big-pickle')).toEqual({
      inputPerToken: 0,
      outputPerToken: 0,
      cacheReadPerToken: 0,
    });
  });

  test('a model missing a rate the app prices with is dropped rather than priced wrong', () => {
    expect(
      openCodeZenPricesFrom(registry)?.get('opencode-zen/a-model-with-no-price'),
    ).toBeUndefined();
  });

  test('every other vendor in the registry stays out of the map', () => {
    const prices = openCodeZenPricesFrom(registry);

    expect([...(prices ?? [])].every(([key]) => key.startsWith('opencode-zen/'))).toBe(true);
    expect(prices?.get('anthropic/claude-opus-5')).toBeUndefined();
  });

  test.each([{}, { opencode: {} }, { opencode: { models: [] } }, [], 'a string'])(
    'a payload that names the gateway nowhere answers nothing rather than an empty map',
    (moved) => {
      expect(openCodeZenPricesFrom(moved)).toBeUndefined();
    },
  );
});

describe('the snapshot the app ships to price a first boot with', () => {
  test('the vendored copy reads as prices, at the rates the gateway publishes', async () => {
    const vendored = join(import.meta.dirname, '../../../resources/opencode-zen-prices.json');
    const prices = openCodeZenPricesFrom(JSON.parse(await readFile(vendored, 'utf8')));

    expect(prices?.get('opencode-zen/gpt-5.5')).toMatchObject({
      inputPerToken: 0.000005,
      outputPerToken: 0.00003,
      cacheReadPerToken: 5e-7,
    });
    expect(prices?.get('opencode-zen/claude-opus-5')?.outputPerToken).toBe(0.000025);
  });

  test('the vendored copy carries the bands the gateway charges above a long context', async () => {
    const vendored = join(import.meta.dirname, '../../../resources/opencode-zen-prices.json');
    const prices = openCodeZenPricesFrom(JSON.parse(await readFile(vendored, 'utf8')));

    expect(prices?.get('opencode-zen/gpt-5.5')?.bands).toEqual([
      {
        contextOverTokens: 272_000,
        inputPerToken: 0.00001,
        outputPerToken: 0.000045,
        cacheReadPerToken: 0.000001,
      },
    ]);
  });

  test('the snapshot covers the catalog rather than a handful of it', async () => {
    const vendored = join(import.meta.dirname, '../../../resources/opencode-zen-prices.json');
    const prices = openCodeZenPricesFrom(JSON.parse(await readFile(vendored, 'utf8')));

    expect(prices?.size).toBeGreaterThan(50);
  });
});

function bandsOf(model: string): readonly ContextBandPrice[] {
  return openCodeZenPricesFrom(registry)?.get(`opencode-zen/${model}`)?.bands ?? [];
}

describe('the bands a model charges above a context threshold', () => {
  test('a context band carries the threshold it opens above, priced per token', () => {
    const band = bandsOf('gemini-3.1-pro').at(0);

    expect(band).toMatchObject({
      contextOverTokens: 200_000,
      inputPerToken: 0.000004,
      outputPerToken: 0.000018,
    });
    expect(band?.cacheReadPerToken).toBeCloseTo(4e-7, 12);
  });

  test('a model quoting one rate carries no bands rather than an empty list', () => {
    expect(bandsOf('claude-opus-5')).toEqual([]);
  });

  test('a band charged for something other than context is left where it stands', () => {
    expect(bandsOf('a-model-tiered-by-something-else')).toEqual([]);
  });
});
