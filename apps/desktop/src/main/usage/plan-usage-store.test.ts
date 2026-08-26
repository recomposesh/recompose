import type { PlanUsageReading, PlanUsageWindow } from '@recompose/contracts';

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { PlanUsageStore } from './plan-usage-store';

import {
  openPlanUsageStore,
  PLAN_USAGE_VERSION,
  PlanUsageNewerSchemaError,
} from './plan-usage-store';

const HOUR = 3_600_000;

const NOW = 1_754_600_400_000;

const NO_RESET_WINDOW: PlanUsageWindow = { length: '5h', spentShare: 0.42 };

function fiveHours(spentShare: number, resetsAt: number): PlanUsageWindow {
  return { length: '5h', spentShare, resetsAt };
}

function aWeek(spentShare: number, resetsAt: number): PlanUsageWindow {
  return { length: 'week', spentShare, resetsAt };
}

function readingFor(accountId: string, windows: readonly PlanUsageWindow[]): PlanUsageReading {
  return { accountId, provider: 'anthropic', readAt: NOW - HOUR, windows };
}

async function aStoreFile(): Promise<string> {
  return join(await mkdtemp(join(tmpdir(), 'recompose-plan-usage-')), 'plan-usage.json');
}

async function anOpenStore(
  file: string,
  onCorrupt: (quarantined: string) => void = () => undefined,
): Promise<PlanUsageStore> {
  return openPlanUsageStore({ file, onCorrupt });
}

async function storedDocument(file: string): Promise<unknown> {
  const held: unknown = JSON.parse(await readFile(file, 'utf8'));

  return held;
}

async function eventually<Value>(read: () => Promise<Value> | Value): Promise<Value> {
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
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('the share a stored reading still stands behind', () => {
  test('a window that has yet to turn over reads back as it was held', async () => {
    const store = await anOpenStore(await aStoreFile());

    store.hold({ work: readingFor('work', [fiveHours(0.42, NOW + HOUR)]) });

    expect(store.read(NOW)).toEqual({ work: readingFor('work', [fiveHours(0.42, NOW + HOUR)]) });
  });

  test('a window whose reset has passed leaves the answer', async () => {
    const store = await anOpenStore(await aStoreFile());

    store.hold({
      work: readingFor('work', [fiveHours(0.42, NOW - HOUR), aWeek(0.19, NOW + 7 * 24 * HOUR)]),
    });

    expect(store.read(NOW)).toEqual({
      work: readingFor('work', [aWeek(0.19, NOW + 7 * 24 * HOUR)]),
    });
  });

  test('a window resetting on this very instant has already turned over', async () => {
    const store = await anOpenStore(await aStoreFile());

    store.hold({ work: readingFor('work', [fiveHours(0.42, NOW), aWeek(0.19, NOW + HOUR)]) });

    expect(store.read(NOW)).toEqual({ work: readingFor('work', [aWeek(0.19, NOW + HOUR)]) });
  });

  test('a window that named no reset leaves the answer, since nothing says it is current', async () => {
    const store = await anOpenStore(await aStoreFile());

    store.hold({ work: readingFor('work', [NO_RESET_WINDOW, aWeek(0.19, NOW + HOUR)]) });

    expect(store.read(NOW)).toEqual({ work: readingFor('work', [aWeek(0.19, NOW + HOUR)]) });
  });

  test('an account left with no live window drops out rather than reading as a plan at zero', async () => {
    const store = await anOpenStore(await aStoreFile());

    store.hold({ work: readingFor('work', [NO_RESET_WINDOW]) });

    expect(store.read(NOW)).toEqual({});
  });
});

describe('what the store holds across the accounts it hears from', () => {
  test('a reading for one account leaves another account standing', async () => {
    const store = await anOpenStore(await aStoreFile());

    store.hold({ work: readingFor('work', [fiveHours(0.42, NOW + HOUR)]) });
    store.hold({ personal: readingFor('personal', [fiveHours(0.11, NOW + HOUR)]) });

    expect(Object.keys(store.read(NOW)).toSorted()).toEqual(['personal', 'work']);
  });

  test('a newer reading for one account replaces the share it held', async () => {
    const store = await anOpenStore(await aStoreFile());

    store.hold({ work: readingFor('work', [fiveHours(0.42, NOW + HOUR)]) });
    store.hold({ work: readingFor('work', [fiveHours(0.91, NOW + HOUR)]) });

    expect(store.read(NOW)).toEqual({ work: readingFor('work', [fiveHours(0.91, NOW + HOUR)]) });
  });
});

describe('the flush cadence', () => {
  test('a quiet three seconds writes the readings to disk', async () => {
    const file = await aStoreFile();
    const store = await anOpenStore(file);

    store.hold({ work: readingFor('work', [fiveHours(0.42, NOW + HOUR)]) });
    await vi.advanceTimersByTimeAsync(3_000);

    expect(await eventually(async () => storedDocument(file))).toEqual({
      schemaVersion: PLAN_USAGE_VERSION,
      readings: { work: readingFor('work', [fiveHours(0.42, NOW + HOUR)]) },
    });
  });

  test('flushNow writes without waiting for any timer', async () => {
    const file = await aStoreFile();
    const store = await anOpenStore(file);

    store.hold({ work: readingFor('work', [fiveHours(0.42, NOW + HOUR)]) });
    await store.flushNow();

    expect(await storedDocument(file)).toEqual({
      schemaVersion: PLAN_USAGE_VERSION,
      readings: { work: readingFor('work', [fiveHours(0.42, NOW + HOUR)]) },
    });
  });
});

describe('the document on disk', () => {
  test('a launch reads back the share the last launch stored', async () => {
    const file = await aStoreFile();
    const store = await anOpenStore(file);

    store.hold({ work: readingFor('work', [fiveHours(0.42, NOW + HOUR)]) });
    await store.flushNow();

    const reopened = await anOpenStore(file);

    expect(reopened.read(NOW)).toEqual({ work: readingFor('work', [fiveHours(0.42, NOW + HOUR)]) });
  });

  test('a stored window that turned over while the app was closed stays off the answer', async () => {
    const file = await aStoreFile();
    const store = await anOpenStore(file);

    store.hold({ work: readingFor('work', [fiveHours(0.42, NOW - HOUR)]) });
    await store.flushNow();

    const reopened = await anOpenStore(file);

    expect(reopened.read(NOW)).toEqual({});
  });

  test('a document from a newer recompose refuses rather than being rewritten', async () => {
    const file = await aStoreFile();

    await writeFile(
      file,
      JSON.stringify({ schemaVersion: PLAN_USAGE_VERSION + 1, readings: {} }),
      'utf8',
    );

    await expect(anOpenStore(file)).rejects.toBeInstanceOf(PlanUsageNewerSchemaError);
  });

  test('a damaged document moves aside and the store opens empty', async () => {
    const file = await aStoreFile();
    const quarantined: string[] = [];

    await writeFile(file, '{ not even close', 'utf8');

    const store = await anOpenStore(file, (path) => {
      quarantined.push(path);
    });

    expect(store.read(NOW)).toEqual({});
    expect(quarantined).toHaveLength(1);
  });

  test('a document holding something other than readings opens empty', async () => {
    const file = await aStoreFile();

    await writeFile(
      file,
      JSON.stringify({ schemaVersion: PLAN_USAGE_VERSION, readings: { work: 'not a reading' } }),
      'utf8',
    );

    const store = await anOpenStore(file);

    expect(store.read(NOW)).toEqual({});
  });
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
  async function blocking(file: string): Promise<() => Promise<void>> {
    await mkdir(file);

    return async () => rm(file, { recursive: true });
  }

  test('the readings wait to be written again rather than being dropped', async () => {
    const file = await aStoreFile();
    const store = await anOpenStore(file);
    const unblock = await blocking(file);

    store.hold({ work: readingFor('work', [fiveHours(0.5, NOW + HOUR)]) });
    await vi.advanceTimersByTimeAsync(3_000);
    await unblock();
    await store.flushNow();

    expect(await storedDocument(file)).toMatchObject({ schemaVersion: PLAN_USAGE_VERSION });
  });

  test('a refused write is said out loud rather than swallowed', async () => {
    const file = await aStoreFile();
    const spoken = refusalHeardFor(file);
    const store = await anOpenStore(file);

    await blocking(file);
    store.hold({ work: readingFor('work', [fiveHours(0.5, NOW + HOUR)]) });
    await vi.advanceTimersByTimeAsync(3_000);

    await expect(spoken).resolves.toContain(file);
  });
});
