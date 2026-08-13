import { describe, expect, test } from 'vitest';

import { engineDirectiveSchema, engineSpendGrantSchema } from './engine-protocol';

const subscriptionSpend = {
  custody: 'subscription',
  provider: 'anthropic',
  accountId: 'acc-claude-max',
  credential: '{"claudeAiOauth":{"accessToken":"oauth-token"}}',
  renewal: 'app',
};

function aGrantSpending(spend: unknown): unknown {
  return {
    kind: 'spend-grant',
    answers: 'g1',
    grant: { verdict: 'resolved', providerOrigin: 'https://api.anthropic.com', spend },
  };
}

function aLookUnder(custody: unknown): unknown {
  return {
    kind: 'list-models',
    id: 'd1',
    origin: 'https://api.anthropic.com',
    custody,
  };
}

describe('who renews the credential a subscription spend rides on', () => {
  test('a spend for an account the app signed in says the app renews it', () => {
    const signedIn = aGrantSpending(subscriptionSpend);

    expect(engineSpendGrantSchema.parse(signedIn)).toEqual(signedIn);
  });

  test('a spend for an adopted account says the owning tool renews it', () => {
    const adopted = aGrantSpending({ ...subscriptionSpend, renewal: 'owning-tool' });

    expect(engineSpendGrantSchema.parse(adopted)).toEqual(adopted);
  });

  test('a spend naming no renewal owner is refused, so the child can never guess', () => {
    const { renewal, ...withoutTheOwner } = subscriptionSpend;

    expect(renewal).toBe('app');
    expect(() => engineSpendGrantSchema.parse(aGrantSpending(withoutTheOwner))).toThrow();
  });

  test('a renewal owner outside the pair is refused', () => {
    for (const renewal of ['nobody', 'provider', '']) {
      expect(() =>
        engineSpendGrantSchema.parse(aGrantSpending({ ...subscriptionSpend, renewal })),
      ).toThrow();
    }
  });
});

describe('who renews the credential a look at a model list rides on', () => {
  test('a look at an adopted account carries the same renewal owner the spend does', () => {
    const look = aLookUnder({ ...subscriptionSpend, renewal: 'owning-tool' });

    expect(engineDirectiveSchema.parse(look)).toEqual(look);
  });

  test('a look at a subscription naming no renewal owner is refused', () => {
    const { renewal, ...withoutTheOwner } = subscriptionSpend;

    expect(renewal).toBe('app');
    expect(() => engineDirectiveSchema.parse(aLookUnder(withoutTheOwner))).toThrow();
  });

  test('a look at a credentialed account names no renewal owner, because nothing there expires', () => {
    expect(() =>
      engineDirectiveSchema.parse(
        aLookUnder({
          custody: 'bearer',
          provider: 'openrouter',
          credential: 'sk-or-7f2c',
          renewal: 'app',
        }),
      ),
    ).toThrow();
  });
});
