import type { UsageBucket, UsageMeasures, UsageTuple } from '@recompose/contracts';

import { describe, expect, it } from 'vitest';

import { groupedBy, scopedBuckets } from './usage-groups';

function measured(requests: number, tokensTotal: number): UsageMeasures {
  return {
    requests,
    failed: 0,
    answered: requests,
    durationMsSum: requests * 500,
    tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0, total: tokensTotal },
  };
}

function bucket(tuple: UsageTuple, requests: number, tokensTotal = 0): UsageBucket {
  return { start: 1_755_000_000_000, tuple, measures: measured(requests, tokensTotal) };
}

const relayCreative = bucket(
  { gateway: 'relay', virtualModel: 'creative', provider: 'openai', accountId: 'work' },
  6,
  600,
);
const relayFast = bucket(
  { gateway: 'relay', virtualModel: 'fast', provider: 'openai', accountId: 'work' },
  3,
  300,
);
const backupCreative = bucket(
  { gateway: 'backup', virtualModel: 'creative', provider: 'anthropic', accountId: 'personal' },
  1,
  100,
);
const gatewayOnly = bucket({ gateway: 'relay' }, 2);

describe('grouping the buckets by one hierarchy level', () => {
  it('sums measures per gateway and hands each group its request share, largest first', () => {
    const rows = groupedBy([relayCreative, relayFast, backupCreative], 'gateway');

    expect(rows.map((row) => row.key)).toEqual(['relay', 'backup']);
    expect(rows[0]?.measures.requests).toBe(9);
    expect(rows[0]?.measures.tokens.total).toBe(900);
    expect(rows[0]?.share).toBeCloseTo(0.9);
    expect(rows[1]?.share).toBeCloseTo(0.1);
  });

  it('groups rows that never reached the level under an undefined key', () => {
    const rows = groupedBy([relayCreative, gatewayOnly], 'provider');

    expect(rows.map((row) => row.key)).toEqual(['openai', undefined]);
    expect(rows[1]?.measures.requests).toBe(2);
  });
});

describe('narrowing the buckets to the standing scope', () => {
  it('keeps only the buckets matching every standing level', () => {
    const scoped = scopedBuckets([relayCreative, relayFast, backupCreative], {
      gateway: 'relay',
      virtualModel: 'creative',
    });

    expect(scoped).toEqual([relayCreative]);
  });

  it('keeps everything when no level stands', () => {
    const all = [relayCreative, relayFast, backupCreative];

    expect(scopedBuckets(all, {})).toEqual(all);
  });

  it('scoping to an account leaves the gateway-raised buckets out', () => {
    expect(scopedBuckets([relayCreative, gatewayOnly], { account: 'work' })).toEqual([
      relayCreative,
    ]);
  });
});
