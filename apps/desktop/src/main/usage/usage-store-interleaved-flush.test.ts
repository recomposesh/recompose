import type { UsageRetentionDays } from '@recompose/contracts';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { openUsageStore } from './usage-store';
import { aStoreFile, eventually, NOW, served, storedLedger } from './usage-store.testkit';

const HOUR = 3_600_000;

const QUIET_MS = 3_000;

const RETENTION: UsageRetentionDays = 30;

/**
 * A retention read a story can hold open, so a row can settle mid-flush.
 *
 * @summary The flush reads the retention setting off the disk before it writes, and rows settle
 * while it waits. Holding that read is what turns a race into a story anyone can rerun.
 */
function heldRetention() {
  let waiting: ((days: UsageRetentionDays) => void) | undefined;
  let holding = false;

  return {
    hold: () => {
      holding = true;
    },
    release: () => {
      waiting?.(RETENTION);
      waiting = undefined;
      holding = false;
    },
    retentionDays: async (): Promise<UsageRetentionDays> => {
      if (!holding) {
        return RETENTION;
      }

      return new Promise<UsageRetentionDays>((resolve) => {
        waiting = resolve;
      });
    },
  };
}

function requestsIn(buckets: readonly { measures: { requests: number } }[]): number {
  return buckets.reduce((sum, bucket) => sum + bucket.measures.requests, 0);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('a row that settles while the ledger is being written', () => {
  async function aStoreHoldingItsRetention() {
    const file = await aStoreFile();
    const retention = heldRetention();
    const store = await openUsageStore({
      file,
      retentionDays: retention.retentionDays,
      accountKindOf: () => 'subscription',
    });

    return { file, retention, store };
  }

  async function settledMidFlush() {
    const standing = await aStoreHoldingItsRetention();

    standing.store.accrue(served('one', NOW - 2 * HOUR));
    standing.retention.hold();
    await vi.advanceTimersByTimeAsync(QUIET_MS);
    standing.store.accrue(served('two', NOW - HOUR));
    standing.retention.release();
    await eventually(async () => storedLedger(standing.file));
    await new Promise((rested) => {
      setImmediate(rested);
    });

    return standing;
  }

  test('stays in the readings the explorer answers from', async () => {
    const { store } = await settledMidFlush();

    expect(requestsIn((await store.report({ range: '24h' })).buckets)).toBe(2);
  });

  test('reaches the disk on the flush that follows', async () => {
    const { file, store } = await settledMidFlush();

    await store.flushNow();

    expect(requestsIn((await storedLedger(file)).buckets)).toBe(2);
  });
});
