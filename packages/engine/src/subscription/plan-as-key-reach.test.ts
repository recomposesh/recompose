import type { SpendGrant } from '@recompose/contracts';

import { describe, expect, test } from 'vitest';

import { planSpentAsAKey } from './plan-as-key-reach';

type ResolvedGrant = Extract<SpendGrant, { verdict: 'resolved' }>;

function grantSpending(spend: ResolvedGrant['spend']): ResolvedGrant {
  return { verdict: 'resolved', providerOrigin: 'https://example.test', spend };
}

const plan = (provider: 'kimi' | 'copilot' | 'anthropic' | 'openai' | 'antigravity') =>
  grantSpending({
    custody: 'subscription',
    renewal: 'app',
    provider,
    accountId: 'account-1',
    credential: 'held',
  });

describe('which plans are spent the way a pasted key is spent', () => {
  test.each(['kimi', 'copilot'] as const)('%s is', (provider) => {
    expect(planSpentAsAKey(plan(provider))?.provider).toBe(provider);
  });

  test.each(['anthropic', 'openai', 'antigravity'] as const)(
    '%s is not, because its own tool owns the wire',
    (provider) => {
      expect(planSpentAsAKey(plan(provider))).toBeUndefined();
    },
  );

  test('a pasted key is not a plan at all', () => {
    const key = grantSpending({
      custody: 'credentialed',
      provider: 'kimi',
      credential: 'sk-kimi',
      accountId: 'account-1',
    });

    expect(planSpentAsAKey(key)).toBeUndefined();
  });

  test('a runtime on this machine carries no plan either', () => {
    expect(planSpentAsAKey(grantSpending({ custody: 'open' }))).toBeUndefined();
  });
});
