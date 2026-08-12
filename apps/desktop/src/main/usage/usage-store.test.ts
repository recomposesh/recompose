import type { LogRow, UsageLedger } from '@recompose/contracts';

import { USAGE_LEDGER_VERSION, usageLedgerSchema } from '@recompose/contracts';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { openUsageStore, UsageNewerSchemaError } from './usage-store';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const NOW = 1_754_600_400_000 - (1_754_600_400_000 % HOUR) + 30 * 60_000;

const CLIENT_KEY = `sha256:${'a'.repeat(64)}`;

function served(id: string, at: number): LogRow {
  return {
    id,
    at,
    gateway: 'relay',
    virtualModel: 'creative',
    origin: 'provider',
    method: 'POST',
    provider: 'anthropic',
    accountId: 'work',
    providerModel: 'claude-sonnet-4-5',
    status: 200,
    durationMs: 912,
    tokens: 1_820,
    usage: { input: 1_200, output: 480, cacheRead: 96, cacheWrite: 32, reasoning: 12 },
    clientKey: CLIENT_KEY,
  };
}

async function aStoreFile(): Promise<string> {
  return join(await mkdtemp(join(tmpdir(), 'recompose-usage-')), 'usage.json');
}

async function anOpenStore(file: string, retentionDays: 7 | 30 | 90 = 30) {
  return openUsageStore({
    file,
    retentionDays: async () => Promise.resolve(retentionDays),
    accountKindOf: () => 'subscription',
  });
}

async function storedLedger(file: string): Promise<UsageLedger> {
  return usageLedgerSchema.parse(JSON.parse(await readFile(file, 'utf8')));
}

async function eventually<Value>(read: () => Promise<Value>): Promise<Value> {
  for (let breath = 0; breath < 50; breath += 1) {
    try {
      return await read();
    } catch {
      await new Promise((rested) => {
        setImmediate(rested);
      });
    }
  }

  return read();
}

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

    const report = await store.report('24h');

    expect(report.bucketWidth).toBe('hour');
    expect(report.buckets).toHaveLength(1);
    expect(report.buckets.at(0)?.measures.requests).toBe(1);
    expect(report.buckets.at(0)?.tuple.accountKind).toBe('subscription');
  });

  test('the hour still filling never rides a report', async () => {
    const store = await anOpenStore(await aStoreFile());

    store.accrue(served('open', NOW - 60_000));

    expect((await store.report('24h')).buckets).toHaveLength(0);
  });

  test('the held buckets hand the open hour to the quota fold, which a report never does', async () => {
    const store = await anOpenStore(await aStoreFile());

    store.accrue(served('open', NOW - 60_000));

    expect(store.heldBuckets()).toHaveLength(1);
    expect(store.heldBuckets().at(0)?.measures.requests).toBe(1);
  });

  test('a week read folds onto days and says so', async () => {
    const store = await anOpenStore(await aStoreFile());

    store.accrue(served('two', NOW - 3 * HOUR));
    store.accrue(served('one', NOW - 2 * HOUR));

    const report = await store.report('7d');

    expect(report.bucketWidth).toBe('day');
    expect(report.buckets.length).toBeLessThanOrEqual(2);
    expect(report.buckets.reduce((sum, bucket) => sum + bucket.measures.requests, 0)).toBe(2);
  });

  test('a report names the retention edge it can see back to', async () => {
    const store = await anOpenStore(await aStoreFile());

    expect((await store.report('24h')).oldestRetainedStart).toBe(NOW - 30 * DAY);
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

    expect((await reopened.report('24h')).buckets).toHaveLength(1);
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

    expect((await store.report('24h')).buckets).toHaveLength(0);
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
