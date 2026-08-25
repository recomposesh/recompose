import { describe, expect, it } from 'vitest';

import type { ArrivedAccount } from './arrived-accounts';

import { productOf, productsArrivedSince } from './arrived-accounts';

const claudePlan: ArrivedAccount = {
  id: 'acc-1',
  provider: 'anthropic',
  kind: 'subscription',
};

const openAiKey: ArrivedAccount = { id: 'acc-2', provider: 'openai', kind: 'api-key' };

describe('the product a mark is remembered against', () => {
  it('names the provider and the way it is held', () => {
    expect(productOf(claudePlan)).toBe('anthropic:subscription');
  });

  it('tells one provider held two ways apart', () => {
    expect(productOf({ provider: 'openai', kind: 'subscription' })).not.toBe(productOf(openAiKey));
  });
});

describe('the sources that arrive marked', () => {
  it('marks an account that landed while setup stood', () => {
    expect(productsArrivedSince(new Set(['acc-1']), [claudePlan, openAiKey])).toStrictEqual([
      'openai:api-key',
    ]);
  });

  it('leaves an account that was already on the machine for the person to pick', () => {
    expect(
      productsArrivedSince(new Set(['acc-1', 'acc-2']), [claudePlan, openAiKey]),
    ).toStrictEqual([]);
  });

  it('marks every account on a machine setup opened with none', () => {
    expect(productsArrivedSince(new Set(), [claudePlan, openAiKey])).toStrictEqual([
      'anthropic:subscription',
      'openai:api-key',
    ]);
  });

  it('reports nothing where no account stands at all', () => {
    expect(productsArrivedSince(new Set(['acc-1']), [])).toStrictEqual([]);
  });
});
