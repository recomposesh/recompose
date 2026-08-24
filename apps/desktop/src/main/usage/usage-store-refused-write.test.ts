import { mkdir, rm } from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  anOpenStore,
  aStoreFile,
  eventually,
  NOW,
  served,
  storedLedger,
} from './usage-store.testkit';

const HOUR = 3_600_000;

const QUIET_MS = 3_000;

async function blocking(file: string): Promise<() => Promise<void>> {
  await mkdir(file);

  return async () => rm(file, { recursive: true });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('a write the disk refused', () => {
  test('the ledger waits to be written again rather than being dropped', async () => {
    const file = await aStoreFile();
    const store = await anOpenStore(file);
    const unblock = await blocking(file);

    store.accrue(served('one', NOW - 2 * HOUR));
    await vi.advanceTimersByTimeAsync(QUIET_MS);
    await unblock();
    await store.flushNow();

    expect((await storedLedger(file)).buckets).toHaveLength(1);
  });

  test('a refused write is said out loud rather than swallowed', async () => {
    const said: string[] = [];
    const spoken = vi.spyOn(console, 'error').mockImplementation((sentence: unknown) => {
      if (typeof sentence === 'string') {
        said.push(sentence);
      }
    });
    const file = await aStoreFile();
    const store = await anOpenStore(file);

    await blocking(file);
    store.accrue(served('one', NOW - 2 * HOUR));
    await vi.advanceTimersByTimeAsync(QUIET_MS);

    const reported = await eventually(() => {
      if (said.length === 0) {
        throw new Error('the refused write has not been reported yet');
      }

      return said.join(' ');
    });

    expect(reported).toContain(file);

    spoken.mockRestore();
  });
});
