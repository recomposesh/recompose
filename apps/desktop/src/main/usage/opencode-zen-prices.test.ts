import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import { openCodeZenPricesFrom } from './opencode-zen-prices';

const registry = {
  anthropic: { models: { 'claude-opus-5': { cost: { input: 5, output: 25 } } } },
  opencode: {
    models: {
      'gpt-5.5': { cost: { input: 5, output: 30, cache_read: 0.5 } },
      'claude-opus-5': { cost: { input: 5, output: 25, cache_read: 0.5, cache_write: 6.25 } },
      'big-pickle': { cost: { input: 0, output: 0, cache_read: 0 } },
      'a-model-with-no-price': { cost: { output: 4 } },
    },
  },
};

describe('the prices the registry publishes for the gateway', () => {
  test('a rate stated per million tokens is held per token', () => {
    const prices = openCodeZenPricesFrom(registry);

    expect(prices?.get('opencode-zen/gpt-5.5')).toEqual({
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

  test('a payload that names the gateway nowhere answers nothing rather than an empty map', () => {
    for (const moved of [{}, { opencode: {} }, { opencode: { models: [] } }, [], 'a string']) {
      expect(openCodeZenPricesFrom(moved)).toBeUndefined();
    }
  });
});

describe('the snapshot the app ships to price a first boot with', () => {
  test('the vendored copy reads as prices, at the rates the gateway publishes', async () => {
    const vendored = join(import.meta.dirname, '../../../resources/opencode-zen-prices.json');
    const prices = openCodeZenPricesFrom(JSON.parse(await readFile(vendored, 'utf8')));

    expect(prices?.get('opencode-zen/gpt-5.5')).toEqual({
      inputPerToken: 0.000005,
      outputPerToken: 0.00003,
      cacheReadPerToken: 5e-7,
    });
    expect(prices?.get('opencode-zen/claude-opus-5')?.outputPerToken).toBe(0.000025);
  });

  test('the snapshot covers the catalog rather than a handful of it', async () => {
    const vendored = join(import.meta.dirname, '../../../resources/opencode-zen-prices.json');
    const prices = openCodeZenPricesFrom(JSON.parse(await readFile(vendored, 'utf8')));

    expect(prices?.size).toBeGreaterThan(50);
  });
});
