import { describe, expect, test } from 'vitest';

import {
  USAGE_LEDGER_VERSION,
  accountBalanceSchema,
  priceMissSchema,
  quotaWindowSchema,
  usageBucketSchema,
  usageLedgerSchema,
  usageRangeSchema,
  usageReportSchema,
} from './usage';

const hourStart = 1_754_600_400_000;

const tuple = {
  gateway: 'relay',
  virtualModel: 'creative',
  provider: 'anthropic',
  providerModel: 'claude-sonnet-4-5',
  accountId: 'work',
  accountKind: 'subscription',
};

const measures = {
  requests: 42,
  failed: 3,
  answered: 39,
  durationMsSum: 61_234.5,
  tokens: {
    input: 91_234,
    output: 20_411,
    cacheRead: 18_400,
    cacheWrite: 2_875,
    reasoning: 3_020,
    total: 132_920,
  },
};

const bucket = { start: hourStart, tuple, measures };

describe('one hour of one tuple as the ledger keeps it', () => {
  test('a full tuple with its measures round-trips', () => {
    expect(usageBucketSchema.parse(bucket)).toEqual(bucket);
  });

  test('a gateway-raised bucket needs no account, because no account served it', () => {
    const raised = { ...bucket, tuple: { gateway: 'relay' } };

    expect(usageBucketSchema.parse(raised)).toEqual(raised);
  });

  test('a negative count is refused, because usage only ever accrues', () => {
    const negative = { ...bucket, measures: { ...measures, requests: -1 } };

    expect(() => usageBucketSchema.parse(negative)).toThrow();
  });

  test('a measure this contract never defined is refused', () => {
    expect(() =>
      usageBucketSchema.parse({ ...bucket, measures: { ...measures, p95: 12 } }),
    ).toThrow();
  });
});

describe('the report a window asks for', () => {
  const report = {
    range: '7d',
    bucketWidth: 'day',
    buckets: [bucket],
    dayCosts: [
      {
        dayStart: hourStart,
        tuple,
        equivalentMicroDollars: 6_200_000,
      },
    ],
    priceMisses: [{ provider: 'anthropic', providerModel: 'claude-mystery', requests: 4 }],
    pricing: { source: 'synced', fetchedAt: hourStart },
    oldestRetainedStart: hourStart,
  };

  test('a report carries buckets, day costs, misses, and where its prices came from', () => {
    expect(usageReportSchema.parse(report)).toEqual(report);
  });

  test('a day cost may carry either basis or both, and never a negative amount', () => {
    const negative = { dayStart: hourStart, tuple, billedMicroDollars: -1 };

    expect(() => usageReportSchema.parse({ ...report, dayCosts: [negative] })).toThrow();
  });

  test('an unpriced model surfaces by name and count rather than hiding as zero dollars', () => {
    expect(priceMissSchema.parse({ providerModel: 'claude-mystery', requests: 4 })).toEqual({
      providerModel: 'claude-mystery',
      requests: 4,
    });
  });

  test('the range vocabulary is the ladder and nothing else', () => {
    expect(() => usageRangeSchema.parse('90d')).toThrow();
  });
});

describe('a subscription window as the quota strip reads it', () => {
  const window = {
    accountId: 'work',
    provider: 'anthropic',
    length: '5h',
    openedAt: hourStart,
    closesAt: hourStart + 5 * 3_600_000,
    burnTokens: 1_200_000,
    record: { burnTokens: 2_000_000, openedAt: hourStart - 86_400_000 },
  };

  test('a window carries its burn and the record it is measured against', () => {
    expect(quotaWindowSchema.parse(window)).toEqual(window);
  });

  test('a window that never opened carries burn alone, because no anchor exists to claim', () => {
    const quiet = { accountId: 'work', provider: 'anthropic', length: 'week', burnTokens: 0 };

    expect(quotaWindowSchema.parse(quiet)).toEqual(quiet);
  });
});

describe('an aggregator balance as the card prints it', () => {
  test('a read balance carries its instant, so staleness is data rather than guesswork', () => {
    const read = {
      accountId: 'router',
      reading: { totalCredits: 25, totalUsage: 18.4, readAt: hourStart },
    };

    expect(accountBalanceSchema.parse(read)).toEqual(read);
  });

  test('a failed read carries the failure and keeps no stale reading it never took', () => {
    const failed = { accountId: 'router', failure: 'The credential was refused.' };

    expect(accountBalanceSchema.parse(failed)).toEqual(failed);
  });
});

describe('the ledger document on disk', () => {
  test('the document carries its version, watermark, recent ids, and buckets', () => {
    const ledger = {
      schemaVersion: USAGE_LEDGER_VERSION,
      accruedThrough: hourStart,
      recentRowIds: ['log-1'],
      buckets: [bucket],
    };

    expect(usageLedgerSchema.parse(ledger)).toEqual(ledger);
  });

  test('a document from a newer schema is refused rather than reinterpreted', () => {
    const newer = {
      schemaVersion: USAGE_LEDGER_VERSION + 1,
      accruedThrough: hourStart,
      recentRowIds: [],
      buckets: [],
    };

    expect(() => usageLedgerSchema.parse(newer)).toThrow();
  });
});
