import type { UsageLedger } from '@recompose/contracts';

import { USAGE_LEDGER_VERSION } from '@recompose/contracts';
import { writeFile } from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { UsageNewerSchemaError } from './usage-store';
import {
  anOpenStore,
  aStoreFile,
  aStoreOverThresholds,
  eventually,
  NOW,
  served,
  storedLedger,
} from './usage-store.testkit';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('accruing and reading', () => {
  test('a settled row from a closed hour answers the next report', async () => {
    const store = await anOpenStore(await aStoreFile());

    store.accrue(served('one', NOW - 2 * HOUR));

    const report = await store.report({ range: '24h' });

    expect(report.bucketWidth).toBe('hour');
    expect(report.buckets).toHaveLength(1);
    expect(report.buckets.at(0)?.measures.requests).toBe(1);
    expect(report.buckets.at(0)?.tuple.accountKind).toBe('subscription');
  });

  test('a row served this minute rides the very next report', async () => {
    const store = await anOpenStore(await aStoreFile());

    store.accrue(served('filling', NOW - 60_000));

    const report = await store.report({ range: '24h' });

    expect(report.buckets).toHaveLength(1);
    expect(report.buckets.at(0)?.measures.requests).toBe(1);
  });

  test('the filling hour folds onto today rather than opening a day of its own', async () => {
    const store = await anOpenStore(await aStoreFile());

    store.accrue(served('earlier', NOW - 3 * HOUR));
    store.accrue(served('filling', NOW - 60_000));

    const report = await store.report({ range: '7d' });

    expect(report.buckets).toHaveLength(1);
    expect(report.buckets.at(0)?.measures.requests).toBe(2);
  });

  test('a week read folds onto days and says so', async () => {
    const store = await anOpenStore(await aStoreFile());

    store.accrue(served('two', NOW - 3 * HOUR));
    store.accrue(served('one', NOW - 2 * HOUR));

    const report = await store.report({ range: '7d' });

    expect(report.bucketWidth).toBe('day');
    expect(report.buckets.length).toBeLessThanOrEqual(2);
    expect(report.buckets.reduce((sum, bucket) => sum + bucket.measures.requests, 0)).toBe(2);
  });
});

describe('what one reader asks a report for', () => {
  test('a week read hands back hours when the reader asks for them', async () => {
    const store = await anOpenStore(await aStoreFile());

    store.accrue(served('two', NOW - 3 * HOUR));
    store.accrue(served('one', NOW - 2 * HOUR));

    const report = await store.report({ range: '7d', bucketWidth: 'hour' });

    expect(report.bucketWidth).toBe('hour');
    expect(report.buckets).toHaveLength(2);
  });

  test('a folded day breaks at the reader own midnight', async () => {
    const store = await anOpenStore(await aStoreFile());

    store.accrue(served('one', NOW - 2 * HOUR));

    const report = await store.report({ range: '7d', dayOffsetMinutes: -180 });

    expect(report.bucketWidth).toBe('day');
    expect(report.buckets.at(0)?.start).toBe(
      (() => {
        const at = NOW - 2 * HOUR;
        const hourStart = at - (at % HOUR);
        const local = hourStart + 3 * HOUR;

        return local - (local % DAY) - 3 * HOUR;
      })(),
    );
  });

  test('a report names the retention edge it can see back to', async () => {
    const store = await anOpenStore(await aStoreFile());

    expect((await store.report({ range: '24h' })).oldestRetainedStart).toBe(NOW - 30 * DAY);
  });
});

describe('the flush cadence', () => {
  test('a quiet three seconds flushes the ledger to disk', async () => {
    const file = await aStoreFile();
    const store = await anOpenStore(file);

    store.accrue(served('one', NOW - 2 * HOUR));
    await vi.advanceTimersByTimeAsync(3_000);

    expect((await eventually(async () => storedLedger(file))).buckets).toHaveLength(1);
  });

  test('sustained accrual still flushes by the thirty second ceiling', async () => {
    const file = await aStoreFile();
    const store = await anOpenStore(file);

    for (let beat = 0; beat < 20; beat += 1) {
      store.accrue(served(`row-${String(beat)}`, NOW - 2 * HOUR + beat));
      await vi.advanceTimersByTimeAsync(2_000);
    }

    expect(
      (await eventually(async () => storedLedger(file))).buckets.at(0)?.measures.requests,
    ).toBeGreaterThan(0);
  });

  test('flushNow writes without waiting for any timer', async () => {
    const file = await aStoreFile();
    const store = await anOpenStore(file);

    store.accrue(served('one', NOW - 2 * HOUR));
    await store.flushNow();

    expect((await storedLedger(file)).buckets).toHaveLength(1);
  });
});

describe('the document on disk', () => {
  test('a reopened store reads its history back', async () => {
    const file = await aStoreFile();
    const store = await anOpenStore(file);

    store.accrue(served('one', NOW - 2 * HOUR));
    await store.flushNow();

    const reopened = await anOpenStore(file);

    expect((await reopened.report({ range: '24h' })).buckets).toHaveLength(1);
  });

  test('a document from a newer recompose refuses rather than being rewritten', async () => {
    const file = await aStoreFile();

    await writeFile(
      file,
      JSON.stringify({
        schemaVersion: USAGE_LEDGER_VERSION + 1,
        accruedThrough: 0,
        recentRowIds: [],
        buckets: [],
      }),
    );

    await expect(anOpenStore(file)).rejects.toBeInstanceOf(UsageNewerSchemaError);
  });

  test('a damaged document quarantines and the store opens empty', async () => {
    const file = await aStoreFile();

    await writeFile(file, '{ not even close');

    const store = await anOpenStore(file);

    expect((await store.report({ range: '24h' })).buckets).toHaveLength(0);
  });
});

describe('the prune', () => {
  test('a bucket outside retention leaves on the next flush', async () => {
    const file = await aStoreFile();
    const store = await anOpenStore(file, 7);

    store.accrue(served('recent', NOW - 2 * HOUR));
    await store.flushNow();

    const heldBefore = await storedLedger(file);
    const kept = heldBefore.buckets.at(0);

    if (kept === undefined) {
      throw new Error('the flushed ledger should hold the recent bucket');
    }

    const aged: UsageLedger = {
      ...heldBefore,
      buckets: [...heldBefore.buckets, { ...kept, start: NOW - 8 * DAY - (NOW % HOUR) }],
    };

    await writeFile(file, JSON.stringify(aged));

    const reopened = await anOpenStore(file, 7);

    await reopened.flushNow();

    expect((await storedLedger(file)).buckets).toHaveLength(1);
  });
});

describe('the thresholds a store stamps a bucket with', () => {
  const aLongPrompt = { input: 300_000, output: 200, cacheRead: 0, cacheWrite: 0, reasoning: 0 };

  test('a long prompt lands under the threshold its own model publishes', async () => {
    const store = await aStoreOverThresholds(await aStoreFile(), () => [272_000]);

    store.accrue({ ...served('long', NOW), usage: aLongPrompt });

    expect(store.heldBuckets().at(0)?.tuple.contextOverTokens).toBe(272_000);
  });

  test('a model publishing no threshold lands its longest prompt in the ordinary bucket', async () => {
    const store = await aStoreOverThresholds(await aStoreFile(), () => []);

    store.accrue({ ...served('long', NOW), usage: aLongPrompt });

    expect(store.heldBuckets().at(0)?.tuple.contextOverTokens).toBeUndefined();
  });

  test('the thresholds are asked for about the model the request actually reached', async () => {
    const asked: string[] = [];
    const store = await aStoreOverThresholds(await aStoreFile(), (provider, providerModel) => {
      asked.push(`${provider ?? ''}/${providerModel ?? ''}`);

      return [];
    });

    store.accrue({ ...served('long', NOW), usage: aLongPrompt });

    expect(asked).toEqual(['anthropic/claude-sonnet-4-5']);
  });
});
