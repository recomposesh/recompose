import { describe, expect, test } from 'vitest';

import { liteLlmPricesFrom } from './litellm-prices';

const map = {
  'claude-sonnet-4-5': {
    input_cost_per_token: 0.000003,
    output_cost_per_token: 0.000015,
    cache_read_input_token_cost: 3e-7,
    cache_creation_input_token_cost: 0.00000375,
    input_cost_per_token_above_200k_tokens: 0.000006,
    output_cost_per_token_above_200k_tokens: 0.0000225,
    cache_read_input_token_cost_above_200k_tokens: 6e-7,
    cache_creation_input_token_cost_above_200k_tokens: 0.0000075,
  },
  'gpt-5.5': {
    input_cost_per_token: 0.00000125,
    output_cost_per_token: 0.00001,
    input_cost_per_token_above_272k_tokens: 0.0000025,
    output_cost_per_token_above_272k_tokens: 0.00002,
    input_cost_per_token_above_272k_tokens_priority: 0.00001,
    output_cost_per_token_above_272k_tokens_priority: 0.00008,
    cache_creation_input_token_cost_above_1hr: 0.000005,
  },
  'a-model-quoting-one-rate': {
    input_cost_per_token: 0.000001,
    output_cost_per_token: 0.000002,
  },
  'a-model-halfway-through-a-band': {
    input_cost_per_token: 0.000001,
    output_cost_per_token: 0.000002,
    input_cost_per_token_above_128k_tokens: 0.000004,
  },
  'dashscope/qwen-flash': {
    input_cost_per_token: 5e-8,
    output_cost_per_token: 4e-7,
    tiered_pricing: [
      { input_cost_per_token: 5e-8, output_cost_per_token: 4e-7, range: [0, 256_000] },
      {
        input_cost_per_token: 2.5e-7,
        output_cost_per_token: 0.000002,
        range: [256_000, 1_000_000],
      },
    ],
  },
  'a-model-priced-by-the-query': {
    input_cost_per_token: 0.000001,
    output_cost_per_token: 0.000002,
    tiered_pricing: [{ input_cost_per_query: 0.005, max_results_range: [0, 50] }],
  },
};

describe('the bands a model charges above a context threshold', () => {
  test('a threshold written into the field names opens a band at that many tokens', () => {
    expect(liteLlmPricesFrom(map)?.get('claude-sonnet-4-5')?.bands).toEqual([
      {
        contextOverTokens: 200_000,
        inputPerToken: 0.000006,
        outputPerToken: 0.0000225,
        cacheReadPerToken: 6e-7,
        cacheWritePerToken: 0.0000075,
      },
    ]);
  });

  test('a rate charged for a service level rather than a context is left where it stands', () => {
    expect(liteLlmPricesFrom(map)?.get('gpt-5.5')?.bands).toEqual([
      { contextOverTokens: 272_000, inputPerToken: 0.0000025, outputPerToken: 0.00002 },
    ]);
  });

  test('a band stating one of the two rates a turn needs is dropped rather than half-priced', () => {
    expect(liteLlmPricesFrom(map)?.get('a-model-halfway-through-a-band')?.bands).toBeUndefined();
  });

  test('a model quoting one rate carries no bands rather than an empty list', () => {
    expect(liteLlmPricesFrom(map)?.get('a-model-quoting-one-rate')?.bands).toBeUndefined();
  });
});

describe('the bands a model states as ranges instead', () => {
  test('each range above the first opens a band where that range starts', () => {
    expect(liteLlmPricesFrom(map)?.get('dashscope/qwen-flash')?.bands).toEqual([
      { contextOverTokens: 256_000, inputPerToken: 2.5e-7, outputPerToken: 0.000002 },
    ]);
  });

  test('the range starting at nothing is the base rate, never a band of its own', () => {
    const bands = liteLlmPricesFrom(map)?.get('dashscope/qwen-flash')?.bands;

    expect(bands?.some((band) => band.contextOverTokens === 0)).toBe(false);
  });

  test('a range measuring something other than context opens no band', () => {
    expect(liteLlmPricesFrom(map)?.get('a-model-priced-by-the-query')?.bands).toBeUndefined();
  });
});

describe('what the price map holds beside its bands', () => {
  test('the base rates read the same whether or not a model publishes a band', () => {
    expect(liteLlmPricesFrom(map)?.get('claude-sonnet-4-5')).toMatchObject({
      inputPerToken: 0.000003,
      outputPerToken: 0.000015,
      cacheReadPerToken: 3e-7,
      cacheWritePerToken: 0.00000375,
    });
  });

  test('a payload that is not a map at all answers nothing', () => {
    for (const moved of [['moved'], 'a string', 42]) {
      expect(liteLlmPricesFrom(moved)).toBeUndefined();
    }
  });
});
