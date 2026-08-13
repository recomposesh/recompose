import type { LogRow, UsageLedger } from '@recompose/contracts';

import { describe, expect, test } from 'vitest';

import {
  accrued,
  dayFolded,
  emptyUsageLedger,
  hourBucketsWithin,
  prunedBefore,
} from './usage-buckets';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const anHourStart = 1_754_600_400_000 - (1_754_600_400_000 % HOUR);

const CLIENT_KEY = `sha256:${'a'.repeat(64)}`;

type RowStanding = {
  at?: number;
  status?: number;
  origin?: LogRow['origin'];
  accountId?: string;
  durationMs?: number | undefined;
  tokens?: number;
  usage?: LogRow['usage'];
};

function served(id: string, standing: RowStanding = {}): LogRow {
  const { at = anHourStart + 60_000, status = 200, origin = 'provider', ...spent } = standing;

  return {
    id,
    at,
    gateway: 'relay',
    virtualModel: 'creative',
    origin,
    method: 'POST',
    provider: 'anthropic',
    accountId: 'work',
    providerModel: 'claude-sonnet-4-5',
    status,
    durationMs: 912,
    tokens: 1_820,
    usage: { input: 1_200, output: 480, cacheRead: 96, cacheWrite: 32, reasoning: 12 },
    clientKey: CLIENT_KEY,
    ...spent,
  };
}

function raised(id: string, at: number): LogRow {
  return {
    id,
    at,
    gateway: 'relay',
    origin: 'gateway',
    method: 'POST',
    status: 502,
    clientKey: CLIENT_KEY,
    failure: 'The gateway could not reach the target.',
  };
}

function ledgerOf(...rows: readonly LogRow[]): UsageLedger {
  return rows.reduce((held, row) => accrued(held, row, 'subscription'), emptyUsageLedger());
}

describe('a settled row landing in its hour', () => {
  test('the row opens a bucket under its UTC hour and its whole tuple', () => {
    const ledger = ledgerOf(served('one'));

    expect(ledger.buckets).toEqual([
      {
        start: anHourStart,
        tuple: {
          gateway: 'relay',
          virtualModel: 'creative',
          provider: 'anthropic',
          providerModel: 'claude-sonnet-4-5',
          accountId: 'work',
          accountKind: 'subscription',
        },
        measures: {
          requests: 1,
          failed: 0,
          answered: 1,
          durationMsSum: 912,
          tokens: {
            input: 1_200,
            output: 480,
            cacheRead: 96,
            cacheWrite: 32,
            reasoning: 12,
            total: 1_820,
          },
        },
      },
    ]);
  });

  test('a second row in the same hour and tuple merges rather than opening a sibling', () => {
    const ledger = ledgerOf(served('one'), served('two', { at: anHourStart + 120_000 }));

    expect(ledger.buckets).toHaveLength(1);
    expect(ledger.buckets.at(0)?.measures.requests).toBe(2);
    expect(ledger.buckets.at(0)?.measures.durationMsSum).toBe(1_824);
    expect(ledger.buckets.at(0)?.measures.tokens.total).toBe(3_640);
  });

  test('the next hour opens its own bucket', () => {
    const ledger = ledgerOf(served('one'), served('two', { at: anHourStart + HOUR }));

    expect(ledger.buckets).toHaveLength(2);
  });

  test('a different account opens its own bucket, because the tuple is the key', () => {
    const ledger = ledgerOf(served('one'), served('two', { accountId: 'home' }));

    expect(ledger.buckets).toHaveLength(2);
  });
});

describe('what a row adds to its bucket', () => {
  test('a gateway-raised failure buckets under the gateway alone and counts as failed', () => {
    const ledger = accrued(emptyUsageLedger(), raised('refused', anHourStart + 5_000), undefined);

    expect(ledger.buckets).toEqual([
      {
        start: anHourStart,
        tuple: { gateway: 'relay' },
        measures: {
          requests: 1,
          failed: 1,
          answered: 0,
          durationMsSum: 0,
          tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0, total: 0 },
        },
      },
    ]);
  });

  test('a request answered at 400 counts as failed and one answered at 399 does not', () => {
    const ledger = ledgerOf(
      served('refused', { status: 400 }),
      served('redirected', { status: 399 }),
    );

    expect(ledger.buckets.at(0)?.measures.failed).toBe(1);
  });

  test('a row without a split adds its total alone, the way older rows read', () => {
    const ledger = ledgerOf(served('unsplit', { usage: undefined, tokens: 700 }));

    expect(ledger.buckets.at(0)?.measures.tokens).toEqual({
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      reasoning: 0,
      total: 700,
    });
  });
});

describe('the replay guard', () => {
  test('accruing a settled row twice equals accruing it once', () => {
    const once = ledgerOf(served('one'));
    const twice = accrued(once, served('one'), 'subscription');

    expect(twice.buckets).toEqual(once.buckets);
  });

  test('a row from far behind the watermark reads as replay and accrues nothing', () => {
    const later = served('later', { at: anHourStart + HOUR });
    const staleReplay = served('forgotten', { at: anHourStart - HOUR });

    const ledger = accrued(ledgerOf(later), staleReplay, 'subscription');

    expect(ledger.buckets).toHaveLength(1);
    expect(ledger.buckets.at(0)?.measures.requests).toBe(1);
  });

  test('a fresh row a few minutes behind the watermark still accrues', () => {
    const settledFirst = served('short', { at: anHourStart + 240_000 });
    const settledSecond = served('long', { at: anHourStart });

    const ledger = ledgerOf(settledFirst, settledSecond);

    expect(ledger.buckets.at(0)?.measures.requests).toBe(2);
  });

  test('either arrival order of the same two rows leaves identical buckets', () => {
    const short = served('short', { at: anHourStart + 240_000 });
    const long = served('long', { at: anHourStart });

    expect(ledgerOf(short, long).buckets).toEqual(ledgerOf(long, short).buckets);
  });

  test('three fixed rows conserve every measure across their buckets', () => {
    const rows = [
      served('one'),
      served('two', { at: anHourStart + HOUR, tokens: 300, usage: undefined }),
      raised('three', anHourStart + HOUR + 10_000),
    ];
    const ledger = rows.reduce((held, row) => accrued(held, row, 'api-key'), emptyUsageLedger());
    const summed = ledger.buckets.reduce(
      (sum, bucket) => ({
        requests: sum.requests + bucket.measures.requests,
        total: sum.total + bucket.measures.tokens.total,
        durations: sum.durations + bucket.measures.durationMsSum,
      }),
      { requests: 0, total: 0, durations: 0 },
    );

    expect(summed).toEqual({ requests: 3, total: 2_120, durations: 1_824 });
  });
});

describe('pruning and reading', () => {
  test('the prune drops buckets strictly before the kept edge and keeps the edge itself', () => {
    const ledger = ledgerOf(served('old', { at: anHourStart - HOUR }), served('kept'));

    const pruned = prunedBefore(ledger, anHourStart);

    expect(pruned.buckets).toHaveLength(1);
    expect(pruned.buckets.at(0)?.start).toBe(anHourStart);
  });

  test('a range read carries the hour still filling beside the closed ones', () => {
    const now = anHourStart + 2 * HOUR + 30_000;
    const ledger = ledgerOf(
      served('closed', { at: anHourStart + HOUR }),
      served('filling', { at: anHourStart + 2 * HOUR }),
    );

    const read = hourBucketsWithin(ledger, '24h', now);

    expect(read.map((bucket) => bucket.start)).toEqual([
      anHourStart + HOUR,
      anHourStart + 2 * HOUR,
    ]);
  });

  test('a range read reaches back its own width and no further', () => {
    const now = anHourStart + 25 * HOUR;
    const ledger = ledgerOf(served('beyond'), served('inside', { at: anHourStart + 2 * HOUR }));

    const read = hourBucketsWithin(ledger, '24h', now);

    expect(read).toHaveLength(1);
    expect(read.at(0)?.start).toBe(anHourStart + 2 * HOUR);
  });

  test('a day breaks where the reader lives, not where UTC does', () => {
    const utcMidnight = anHourStart - (anHourStart % DAY);
    const ledger = ledgerOf(
      served('late-evening', { at: utcMidnight - 2 * HOUR }),
      served('after-midnight', { at: utcMidnight + HOUR }),
    );

    const aheadByThree = dayFolded(ledger.buckets, -180);

    expect(aheadByThree).toHaveLength(1);
    expect(aheadByThree.at(0)?.start).toBe(utcMidnight - 3 * HOUR);
    expect(aheadByThree.at(0)?.measures.requests).toBe(2);
  });

  test('folding hours into days keeps tuples apart and sums their measures', () => {
    const dayStart = anHourStart - (anHourStart % DAY);
    const ledger = ledgerOf(
      served('early'),
      served('other-account', { accountId: 'home', at: anHourStart + 120_000 }),
      served('later-same-day', { at: anHourStart + HOUR }),
    );

    const days = dayFolded(ledger.buckets);

    expect(days).toHaveLength(2);
    expect(days.filter((bucket) => bucket.start === dayStart)).toHaveLength(2);
    expect(days.find((bucket) => bucket.tuple.accountId === 'work')?.measures.requests).toBe(2);
  });
});
