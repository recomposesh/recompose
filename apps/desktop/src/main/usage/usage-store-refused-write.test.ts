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

/**
 * The sentence naming this spec's own file, out of everything the console heard.
 *
 * @summary Another store left standing by an earlier test keeps retrying on the same fake clock, so
 * the first sentence the spy catches is not always the refusal this spec caused. The wait advances
 * the fake clock rather than spinning, because a real write has to reach the disk and refuse before
 * anything is said, and a spin under fake timers never lets it.
 */
function namingThisFile(said: readonly string[], file: string): string | undefined {
  return said.find((sentence) => sentence.includes(file));
}

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

    const reported = await eventually(async () => {
      await vi.advanceTimersByTimeAsync(10);

      const mine = namingThisFile(said, file);

      if (mine === undefined) {
        throw new Error('the refused write has not been reported yet');
      }

      return mine;
    });

    expect(reported).toContain(file);

    spoken.mockRestore();
  });
});
