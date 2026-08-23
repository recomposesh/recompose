import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { BalanceNewerSchemaError, openBalanceStore } from './balance-store';

const NOW = 1_754_600_400_000;

const DAY_MS = 86_400_000;

const aReading = { remaining: 6.6, added: 25, spent: 18.4, readAt: NOW };

async function aLedgerFile(): Promise<string> {
  return join(await mkdtemp(join(tmpdir(), 'recompose-balances-')), 'balances.json');
}

async function afterAKeptReading(file: string): Promise<void> {
  const store = await openBalanceStore({ file });

  store.keep('router-1', aReading);
  await store.flushNow();
}

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'],
  });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('the balances a restart restores', () => {
  test('a machine that never read a balance restores none', async () => {
    const store = await openBalanceStore({ file: await aLedgerFile() });

    expect(store.restored()).toEqual([]);
  });

  test('a reading kept and flushed stands again after a restart', async () => {
    const file = await aLedgerFile();

    await afterAKeptReading(file);

    expect((await openBalanceStore({ file })).restored()).toEqual([
      { accountId: 'router-1', reading: aReading },
    ]);
  });

  test('a later reading replaces the earlier one, because a card holds one balance', async () => {
    const file = await aLedgerFile();
    const store = await openBalanceStore({ file });
    const later = { remaining: 5.4, added: 25, spent: 19.6, readAt: NOW + 90_000 };

    store.keep('router-1', aReading);
    store.keep('router-1', later);
    await store.flushNow();

    expect((await openBalanceStore({ file })).restored()).toEqual([
      { accountId: 'router-1', reading: later },
    ]);
  });

  test('two accounts each keep their own reading', async () => {
    const file = await aLedgerFile();
    const store = await openBalanceStore({ file });
    const second = { remaining: 3.0, added: 4, spent: 1, readAt: NOW };

    store.keep('router-1', aReading);
    store.keep('router-2', second);
    await store.flushNow();

    expect((await openBalanceStore({ file })).restored()).toEqual([
      { accountId: 'router-1', reading: aReading },
      { accountId: 'router-2', reading: second },
    ]);
  });
});

describe('how long a stored reading is worth restoring', () => {
  test('a reading still inside ninety days is restored with its own stamp', async () => {
    const file = await aLedgerFile();

    await afterAKeptReading(file);
    vi.setSystemTime(NOW + 89 * DAY_MS);

    expect((await openBalanceStore({ file })).restored()).toEqual([
      { accountId: 'router-1', reading: aReading },
    ]);
  });

  test('a reading past ninety days is dropped rather than restored', async () => {
    const file = await aLedgerFile();

    await afterAKeptReading(file);
    vi.setSystemTime(NOW + 91 * DAY_MS);

    expect((await openBalanceStore({ file })).restored()).toEqual([]);
  });

  test('a reading that aged out leaves the document on the next flush', async () => {
    const file = await aLedgerFile();

    await afterAKeptReading(file);
    vi.setSystemTime(NOW + 91 * DAY_MS);

    const store = await openBalanceStore({ file });

    await store.flushNow();

    expect(JSON.parse(await readFile(file, 'utf8'))).toEqual({
      schemaVersion: 1,
      readings: [],
    });
  });
});

describe('a balances document this build cannot read', () => {
  test('a newer schema refuses loudly rather than being reinterpreted', async () => {
    const file = await aLedgerFile();

    await writeFile(file, JSON.stringify({ schemaVersion: 2, readings: [] }), 'utf8');

    await expect(openBalanceStore({ file })).rejects.toThrow(BalanceNewerSchemaError);
  });

  test('a damaged document is moved aside and restores nothing', async () => {
    const file = await aLedgerFile();
    const quarantined: string[] = [];

    await writeFile(file, 'not json at all', 'utf8');

    const store = await openBalanceStore({
      file,
      onCorrupt: (path) => {
        quarantined.push(path);
      },
    });

    expect(store.restored()).toEqual([]);
    expect(quarantined).toHaveLength(1);
  });

  test('a document whose readings moved shape restores nothing rather than guessing', async () => {
    const file = await aLedgerFile();

    await writeFile(file, JSON.stringify({ schemaVersion: 1, balances: [] }), 'utf8');

    expect((await openBalanceStore({ file })).restored()).toEqual([]);
  });
});
