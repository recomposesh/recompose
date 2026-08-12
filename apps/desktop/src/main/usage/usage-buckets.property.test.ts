import type { LogRow, UsageBucket, UsageLedger } from '@recompose/contracts';

import { fc, test as propertyTest } from '@fast-check/vitest';
import { expect } from 'vitest';

import { accrued, emptyUsageLedger } from './usage-buckets';

const BASE_AT = 1_754_600_400_000;

const CLIENT_KEY = `sha256:${'a'.repeat(64)}`;

const anyRow: fc.Arbitrary<Omit<LogRow, 'id'>> = fc
  .record(
    {
      at: fc.integer({ min: BASE_AT, max: BASE_AT + 240_000 }),
      status: fc.integer({ min: 100, max: 599 }),
      origin: fc.constantFrom<LogRow['origin']>('provider', 'gateway'),
      accountId: fc.constantFrom('work', 'home'),
      durationMs: fc.integer({ min: 0, max: 10_000 }),
      tokens: fc.integer({ min: 0, max: 5_000 }),
    },
    { requiredKeys: ['at', 'status', 'origin'] },
  )
  .map((standing) => ({
    gateway: 'relay',
    virtualModel: 'creative',
    method: 'POST',
    clientKey: CLIENT_KEY,
    ...standing,
  }));

const uniqueRows: fc.Arbitrary<readonly LogRow[]> = fc
  .array(anyRow, { maxLength: 24 })
  .map((rows) => rows.map((row, index) => ({ ...row, id: `row-${String(index)}` })));

function ledgerOf(rows: readonly LogRow[]): UsageLedger {
  return rows.reduce((held, row) => accrued(held, row, 'api-key'), emptyUsageLedger());
}

function sortedBuckets(ledger: UsageLedger): readonly UsageBucket[] {
  return ledger.buckets.toSorted(
    (earlier, later) =>
      earlier.start - later.start ||
      JSON.stringify(earlier.tuple).localeCompare(JSON.stringify(later.tuple)),
  );
}

function summed(buckets: readonly UsageBucket[], read: (bucket: UsageBucket) => number): number {
  return buckets.reduce((sum, bucket) => sum + read(bucket), 0);
}

propertyTest.prop([uniqueRows])(
  'accrual conserves every measure: buckets sum to what the rows carried',
  (rows) => {
    const ledger = ledgerOf(rows);

    expect(summed(ledger.buckets, (bucket) => bucket.measures.requests)).toBe(rows.length);
    expect(summed(ledger.buckets, (bucket) => bucket.measures.tokens.total)).toBe(
      rows.reduce((sum, row) => sum + (row.tokens ?? 0), 0),
    );
    expect(summed(ledger.buckets, (bucket) => bucket.measures.durationMsSum)).toBe(
      rows.reduce((sum, row) => sum + (row.durationMs ?? 0), 0),
    );
    expect(summed(ledger.buckets, (bucket) => bucket.measures.answered)).toBe(
      rows.filter((row) => row.durationMs !== undefined).length,
    );
  },
);

propertyTest.prop([uniqueRows])(
  'accrual is order independent: any settle order leaves identical buckets',
  (rows) => {
    const reversed = rows.toReversed();

    expect(sortedBuckets(ledgerOf(reversed))).toEqual(sortedBuckets(ledgerOf(rows)));
  },
);

propertyTest.prop([uniqueRows])(
  'accrual is idempotent: replaying every row accrues nothing twice',
  (rows) => {
    const once = ledgerOf(rows);
    const replayed = rows.reduce((held, row) => accrued(held, row, 'api-key'), once);

    expect(replayed.buckets).toEqual(once.buckets);
  },
);
