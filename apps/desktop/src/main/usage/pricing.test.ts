import { describe, expect, test } from 'vitest';

import type { PriceMap } from './pricing';

import { dayCostsOf } from './pricing';
import { aDay } from './pricing.testkit';

const DAY_START = 1_754_524_800_000;

const prices: PriceMap = new Map([
  [
    'claude-sonnet-4-5',
    {
      inputPerToken: 0.000003,
      outputPerToken: 0.000015,
      cacheReadPerToken: 3e-7,
      cacheWritePerToken: 0.00000375,
    },
  ],
  ['gpt-5-mini', { inputPerToken: 2.5e-7, outputPerToken: 0.000002 }],
]);

describe('pricing a day of traffic by its basis', () => {
  test('key-served traffic prices as billed micro-dollars, exact and integer', () => {
    const { dayCosts, priceMisses } = dayCostsOf([aDay()], prices);

    expect(priceMisses).toEqual([]);
    expect(dayCosts).toEqual([
      {
        dayStart: DAY_START,
        tuple: aDay().tuple,
        billedMicroDollars: 4_500_000,
      },
    ]);
  });

  test('subscription traffic prices as the equivalent figure, never as a bill', () => {
    const { dayCosts } = dayCostsOf([aDay({ accountKind: 'subscription' })], prices);

    expect(dayCosts.at(0)?.equivalentMicroDollars).toBe(4_500_000);
    expect(dayCosts.at(0)?.billedMicroDollars).toBeUndefined();
  });

  test('aggregator traffic bills the way a key does', () => {
    const { dayCosts } = dayCostsOf([aDay({ accountKind: 'aggregator' })], prices);

    expect(dayCosts.at(0)?.billedMicroDollars).toBe(4_500_000);
  });

  test('local traffic carries no cost row at all', () => {
    const { dayCosts, priceMisses } = dayCostsOf([aDay({ accountKind: 'local' })], prices);

    expect(dayCosts).toEqual([]);
    expect(priceMisses).toEqual([]);
  });

  test('cached input prices at the cache rates and reasoning carries no price of its own', () => {
    const measured = {
      input: 0,
      output: 0,
      cacheRead: 1_000_000,
      cacheWrite: 100_000,
      reasoning: 500_000,
    };

    const { dayCosts } = dayCostsOf([aDay({ tokens: measured })], prices);

    expect(dayCosts.at(0)?.billedMicroDollars).toBe(675_000);
  });
});

describe('what the map cannot or need not price', () => {
  test('a model the map cannot name surfaces by request count rather than as zero dollars', () => {
    const { dayCosts, priceMisses } = dayCostsOf(
      [aDay({ providerModel: 'claude-mystery', requests: 7 })],
      prices,
    );

    expect(dayCosts).toEqual([]);
    expect(priceMisses).toEqual([
      { provider: 'anthropic', providerModel: 'claude-mystery', requests: 7 },
    ]);
  });

  test('a provider-prefixed key resolves, the way the LiteLLM map often writes one', () => {
    const prefixed: PriceMap = new Map([
      ['anthropic/claude-sonnet-4-5', { inputPerToken: 0.000003, outputPerToken: 0.000015 }],
    ]);

    expect(dayCostsOf([aDay()], prefixed).priceMisses).toEqual([]);
  });

  test('a dated model name resolves through its undated twin', () => {
    const { priceMisses } = dayCostsOf(
      [aDay({ providerModel: 'claude-sonnet-4-5-20250929' })],
      prices,
    );

    expect(priceMisses).toEqual([]);
  });

  test('a bucket that reached no model at all is not a miss, because nothing was served', () => {
    const raised = aDay({ providerModel: undefined, tokens: { input: 0, output: 0, total: 0 } });

    const { dayCosts, priceMisses } = dayCostsOf([raised], prices);

    expect(dayCosts).toEqual([]);
    expect(priceMisses).toEqual([]);
  });

  test('a missing cache rate prices cached tokens at nothing rather than guessing', () => {
    const measured = { input: 1_000_000, output: 0, cacheRead: 1_000_000 };

    const { dayCosts } = dayCostsOf(
      [aDay({ providerModel: 'gpt-5-mini', tokens: measured })],
      prices,
    );

    expect(dayCosts.at(0)?.billedMicroDollars).toBe(250_000);
  });
});

describe('how price misses accumulate', () => {
  test('two days missing the same model fold into one miss with summed requests', () => {
    const { priceMisses } = dayCostsOf(
      [
        aDay({ providerModel: 'claude-mystery', requests: 7 }),
        aDay({ providerModel: 'claude-mystery', requests: 5 }),
      ],
      prices,
    );

    expect(priceMisses).toStrictEqual([
      { provider: 'anthropic', providerModel: 'claude-mystery', requests: 12 },
    ]);
  });

  test('folding one model leaves every other miss standing untouched', () => {
    const { priceMisses } = dayCostsOf(
      [
        aDay({ providerModel: 'claude-mystery', requests: 7 }),
        aDay({ providerModel: 'gpt-mystery', requests: 2 }),
        aDay({ providerModel: 'claude-mystery', requests: 5 }),
      ],
      prices,
    );

    expect(priceMisses).toStrictEqual([
      { provider: 'anthropic', providerModel: 'claude-mystery', requests: 12 },
      { provider: 'anthropic', providerModel: 'gpt-mystery', requests: 2 },
    ]);
  });

  test('a miss whose day names no provider surfaces without inventing one', () => {
    const { priceMisses } = dayCostsOf(
      [aDay({ provider: undefined, providerModel: 'claude-mystery', requests: 3 })],
      prices,
    );

    expect(priceMisses).toStrictEqual([{ providerModel: 'claude-mystery', requests: 3 }]);
  });
});

describe('whose rate a served model is priced at', () => {
  test("a gateway reselling a model prices at its own rate, never the model maker's", () => {
    const resold: PriceMap = new Map([
      ['gpt-5.5', { inputPerToken: 0.00000125, outputPerToken: 0.00001 }],
      ['opencode-zen/gpt-5.5', { inputPerToken: 0.000005, outputPerToken: 0.00003 }],
    ]);

    const served = aDay({
      provider: 'opencode-zen',
      providerModel: 'gpt-5.5',
      tokens: { input: 1_000_000, output: 0, total: 1_000_000 },
    });

    expect(dayCostsOf([served], resold).dayCosts.at(0)?.billedMicroDollars).toBe(5_000_000);
  });
});
