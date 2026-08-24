import type { UsageBucket, UsageTuple } from '@recompose/contracts';

import { describe, expect, it } from 'vitest';

import type { UsageSearch } from './usage-search';

import { ABSENT_MEMBER_KEY, filteredBuckets, groupedBy, memberNames } from './usage-groups';

const HOUR = 3_600_000;

function bucket(tuple: Partial<UsageTuple>, requests: number, start = HOUR): UsageBucket {
  return {
    start,
    tuple: { gateway: 'relay', ...tuple },
    measures: {
      requests,
      failed: 0,
      answered: requests,
      durationMsSum: requests * 500,
      tokens: {
        input: requests * 10,
        output: requests * 5,
        cacheRead: 0,
        cacheWrite: 0,
        reasoning: 0,
        total: requests * 15,
      },
    },
  };
}

function viewing(over: Partial<UsageSearch> = {}): UsageSearch {
  return { range: '24h', metric: 'requests', stackedBy: 'gateway', ...over };
}

const served: readonly UsageBucket[] = [
  bucket({ gateway: 'relay', accountId: 'k1', provider: 'anthropic', virtualModel: 'fast' }, 6),
  bucket({ gateway: 'backup', accountId: 'k1', provider: 'anthropic', virtualModel: 'fast' }, 3),
  bucket({ gateway: 'relay', accountId: 'g1', provider: 'openrouter', virtualModel: 'deep' }, 1),
];

describe('what the standing filters keep', () => {
  it('keeps everything while both filters stand on everything', () => {
    expect(filteredBuckets(served, viewing())).toHaveLength(3);
  });

  it('keeps the named gateways and drops the rest', () => {
    const kept = filteredBuckets(served, viewing({ gateways: ['backup'] }));

    expect(kept.map((one) => one.tuple.gateway)).toEqual(['backup']);
  });

  it('keeps the named providers, which are the accounts a person connected', () => {
    const kept = filteredBuckets(served, viewing({ providers: ['g1'] }));

    expect(kept.map((one) => one.tuple.accountId)).toEqual(['g1']);
  });

  it('narrows by both filters at once rather than by either alone', () => {
    const kept = filteredBuckets(served, viewing({ gateways: ['relay'], providers: ['k1'] }));

    expect(kept).toHaveLength(1);
    expect(kept.at(0)?.measures.requests).toBe(6);
  });
});

describe('folding the same buckets onto one dimension', () => {
  it('ranks the members largest first', () => {
    const rows = groupedBy(served, 'gateway');

    expect(rows.map((row) => row.key)).toEqual(['relay', 'backup']);
    expect(rows.at(0)?.measures.requests).toBe(7);
  });

  it('reads a share of the folded window, not of the whole ledger', () => {
    const rows = groupedBy(served, 'gateway');

    expect(rows.at(1)?.share).toBeCloseTo(3 / 10);
  });

  it('keeps traffic that never reached the dimension under an unnamed key', () => {
    const rows = groupedBy([bucket({ gateway: 'relay' }, 2)], 'virtualModel');

    expect(rows.at(0)?.key).toBeUndefined();
  });

  it('names a target by its real model and the account that served it', () => {
    const rows = groupedBy(
      [bucket({ accountId: 'k1', providerModel: 'claude-sonnet-5' }, 4)],
      'target',
    );

    expect(rows.at(0)?.key).toBe('claude-sonnet-5 k1');
  });
});

describe('the members a filter menu lists', () => {
  it('ranks every member the window served, largest first', () => {
    expect(memberNames(served, 'gateway')).toEqual([
      { key: 'relay', requests: 7 },
      { key: 'backup', requests: 3 },
    ]);
  });

  it('lists traffic that never reached the dimension under the absent member', () => {
    expect(memberNames([bucket({ gateway: 'relay' }, 2)], 'account')).toEqual([
      { key: ABSENT_MEMBER_KEY, requests: 2 },
    ]);
  });

  it('lists the absent member beside the named ones it stands with', () => {
    const window = [...served, bucket({ gateway: 'relay' }, 20)];

    expect(memberNames(window, 'account').map((member) => member.key)).toEqual([
      ABSENT_MEMBER_KEY,
      'k1',
      'g1',
    ]);
  });
});

describe('narrowing onto traffic that reached no account', () => {
  const refused = bucket({ gateway: 'relay' }, 4);

  it('keeps only the buckets that reached none while the absent member stands alone', () => {
    const kept = filteredBuckets([...served, refused], viewing({ providers: [ABSENT_MEMBER_KEY] }));

    expect(kept).toEqual([refused]);
  });

  it('keeps a named account beside the absent member when both are picked', () => {
    const kept = filteredBuckets(
      [...served, refused],
      viewing({ providers: [ABSENT_MEMBER_KEY, 'g1'] }),
    );

    expect(kept.map((one) => one.tuple.accountId)).toEqual(['g1', undefined]);
  });

  it('leaves the refused traffic out while only a named account stands', () => {
    const kept = filteredBuckets([...served, refused], viewing({ providers: ['g1'] }));

    expect(kept).toHaveLength(1);
  });
});
