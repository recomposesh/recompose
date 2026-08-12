import { describe, expectTypeOf, test } from 'vitest';

import type {
  UsageBucket,
  UsageLedger,
  UsageMeasures,
  UsageRange,
  UsageReport,
  UsageTuple,
} from './index';

describe('the tuple every bucket accrues under', () => {
  test('the tuple is the domain hierarchy with only the gateway certain', () => {
    expectTypeOf<UsageTuple>().toEqualTypeOf<{
      gateway: string;
      virtualModel?: string | undefined;
      provider?: string | undefined;
      providerModel?: string | undefined;
      accountId?: string | undefined;
      accountKind?: 'subscription' | 'api-key' | 'aggregator' | 'local' | undefined;
    }>();
  });
});

describe('what one bucket counts', () => {
  test('the measures carry counts, a duration sum, and the six-way token object', () => {
    expectTypeOf<UsageMeasures>().toEqualTypeOf<{
      requests: number;
      failed: number;
      answered: number;
      durationMsSum: number;
      tokens: {
        input: number;
        output: number;
        cacheRead: number;
        cacheWrite: number;
        reasoning: number;
        total: number;
      };
    }>();
  });

  test('no bucket carries a cost, because cost exists at day width only', () => {
    expectTypeOf<UsageBucket>().not.toHaveProperty('cost');
    expectTypeOf<UsageMeasures>().not.toHaveProperty('billedMicroDollars');
  });
});

describe('the report a range read answers', () => {
  test('the ranges are the ladder and nothing else', () => {
    expectTypeOf<UsageRange>().toEqualTypeOf<'24h' | '7d' | '30d'>();
  });

  test('the runs a report carries stand frozen for every reader', () => {
    expectTypeOf<UsageReport['buckets']>().toEqualTypeOf<readonly UsageBucket[]>();
    expectTypeOf<UsageReport['pricing']['source']>().toEqualTypeOf<'synced' | 'bundled'>();
  });
});

describe('the ledger document on disk', () => {
  test('the version is the literal this chain opens at', () => {
    expectTypeOf<UsageLedger['schemaVersion']>().toEqualTypeOf<1>();
  });

  test('the replay guard rides the document itself', () => {
    expectTypeOf<UsageLedger['accruedThrough']>().toEqualTypeOf<number>();
    expectTypeOf<UsageLedger['recentRowIds']>().toEqualTypeOf<readonly string[]>();
  });
});
