import { mkdir, rm } from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { anOpenStore, aStoreFile, NOW, served, storedLedger } from './usage-store.testkit';

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
 * The refusal this spec is waiting on, settled the moment the console hears it.
 *
 * @summary Two things made polling wrong here. Another store left standing by an earlier test keeps
 * retrying on the same fake clock, so the first sentence a spy catches is not always this spec's,
 * and a real write has to reach the disk and be refused before anything is said at all, which a
 * loaded runner takes longer over than any fixed number of turns allows. Awaiting the sentence
 * gives it the whole test budget and names the file it must carry.
 */
async function refusalHeardFor(file: string): Promise<string> {
  return new Promise<string>((settle) => {
    vi.spyOn(console, 'error').mockImplementation((sentence: unknown) => {
      if (typeof sentence === 'string' && sentence.includes(file)) {
        settle(sentence);
      }
    });
  });
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
    const file = await aStoreFile();
    const spoken = refusalHeardFor(file);
    const store = await anOpenStore(file);

    await blocking(file);
    store.accrue(served('one', NOW - 2 * HOUR));
    await vi.advanceTimersByTimeAsync(QUIET_MS);

    await expect(spoken).resolves.toContain(file);
  });
});
