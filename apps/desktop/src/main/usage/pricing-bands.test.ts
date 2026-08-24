import { describe, expect, test } from 'vitest';

import type { PriceMap } from './pricing';

import { contextThresholdsIn, dayCostsOf } from './pricing';
import { aDay } from './pricing.testkit';

describe('the band a long prompt is charged in', () => {
  const tiered: PriceMap = new Map([
    [
      'opencode-zen/gpt-5.5',
      {
        inputPerToken: 0.000005,
        outputPerToken: 0.00003,
        bands: [{ contextOverTokens: 272_000, inputPerToken: 0.00001, outputPerToken: 0.000045 }],
      },
    ],
  ]);

  function aTieredDay(contextOverTokens?: number) {
    return aDay({
      provider: 'opencode-zen',
      providerModel: 'gpt-5.5',
      tokens: { input: 1_000_000, output: 0, total: 1_000_000 },
      ...(contextOverTokens === undefined ? {} : { contextOverTokens }),
    });
  }

  test('traffic that stayed under the threshold is charged at the base rate', () => {
    expect(dayCostsOf([aTieredDay()], tiered).dayCosts.at(0)?.billedMicroDollars).toBe(5_000_000);
  });

  test('traffic that rose above the threshold is charged in the band it landed in', () => {
    expect(dayCostsOf([aTieredDay(272_000)], tiered).dayCosts.at(0)?.billedMicroDollars).toBe(
      10_000_000,
    );
  });

  test('a band the prices no longer publish falls back to the base rate, never to nothing', () => {
    expect(dayCostsOf([aTieredDay(999_000)], tiered).dayCosts.at(0)?.billedMicroDollars).toBe(
      5_000_000,
    );
  });

  test('a model publishing no band prices its long traffic at the one rate it has', () => {
    const flat: PriceMap = new Map([
      ['opencode-zen/gpt-5.5', { inputPerToken: 0.000005, outputPerToken: 0.00003 }],
    ]);

    expect(dayCostsOf([aTieredDay(272_000)], flat).dayCosts.at(0)?.billedMicroDollars).toBe(
      5_000_000,
    );
  });
});

describe('the thresholds a model publishes, as accrual asks for them', () => {
  const banded: PriceMap = new Map([
    ['gpt-5.5', { inputPerToken: 1, outputPerToken: 1 }],
    [
      'opencode-zen/gpt-5.5',
      {
        inputPerToken: 1,
        outputPerToken: 1,
        bands: [
          { contextOverTokens: 500_000, inputPerToken: 3, outputPerToken: 3 },
          { contextOverTokens: 272_000, inputPerToken: 2, outputPerToken: 2 },
        ],
      },
    ],
  ]);

  test('a model publishing bands names every threshold they open at', () => {
    expect(contextThresholdsIn(banded, 'opencode-zen', 'gpt-5.5')).toEqual([272_000, 500_000]);
  });

  test('the reselling gateway is asked before the bare name, the way pricing asks', () => {
    expect(contextThresholdsIn(banded, 'openai', 'gpt-5.5')).toEqual([]);
  });

  test('a model the map cannot name publishes no threshold rather than refusing', () => {
    expect(contextThresholdsIn(banded, 'openai', 'a-model-nobody-priced')).toEqual([]);
  });

  test('a request that reached no model at all asks about none', () => {
    expect(contextThresholdsIn(banded, 'openai', undefined)).toEqual([]);
  });
});
