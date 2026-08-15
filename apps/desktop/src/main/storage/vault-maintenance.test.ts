import { ACCOUNTS_VERSION } from '@recompose/contracts';
import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import type { VaultDocument } from './vault';

import { reconcileVault } from './vault-maintenance';

async function aStoreHolding(vault: VaultDocument, refs: readonly string[]): Promise<string> {
  const home = await mkdtemp(join(tmpdir(), 'recompose-vault-'));

  await writeFile(join(home, 'vault.bin'), JSON.stringify(vault), 'utf8');
  await writeFile(
    join(home, 'accounts.json'),
    JSON.stringify({
      schemaVersion: ACCOUNTS_VERSION,
      accounts: refs.map((ref, at) => ({
        id: `acc-${String(at)}`,
        provider: 'anthropic',
        kind: 'api-key',
        label: `key ${String(at)}`,
        credentialRef: ref,
      })),
    }),
    'utf8',
  );

  return home;
}

function vaultHolding(refs: readonly string[]): VaultDocument {
  return {
    schemaVersion: 1,
    entries: Object.fromEntries(refs.map((ref) => [ref, `encrypted-${ref}`])),
  };
}

/** One field off a written file, read straight rather than through the loader that wrote it. */
async function fieldWritten(home: string, file: string, field: string): Promise<unknown> {
  const raw: unknown = JSON.parse(await readFile(join(home, file), 'utf8'));

  if (raw === null || typeof raw !== 'object' || !(field in raw)) {
    throw new Error(`${file} held no ${field}`);
  }

  return Object.getOwnPropertyDescriptor(raw, field)?.value;
}

/** The refs a written vault holds. */
async function refsWritten(home: string): Promise<string[]> {
  const entries = await fieldWritten(home, 'vault.bin', 'entries');

  return entries === null || typeof entries !== 'object' ? [] : Object.keys(entries);
}

/** How many rows the account file holds. */
async function rowsWritten(home: string): Promise<number> {
  const accounts = await fieldWritten(home, 'accounts.json', 'accounts');

  return Array.isArray(accounts) ? accounts.length : 0;
}

describe('the repair a boot runs over the two stores', () => {
  test('an orphaned entry is gone from the file, not only from the answer', async () => {
    const home = await aStoreHolding(vaultHolding(['c-1', 'c-orphan']), ['c-1']);

    const settled = await reconcileVault(home, () => undefined);

    expect(settled.swept).toEqual(['c-orphan']);
    await expect(refsWritten(home)).resolves.toEqual(['c-1']);
  });

  test('a store with nothing orphaned is not written at all', async () => {
    const home = await aStoreHolding(vaultHolding(['c-1']), ['c-1']);
    const before = await stat(join(home, 'vault.bin'));

    await reconcileVault(home, () => undefined);

    expect((await stat(join(home, 'vault.bin'))).mtimeMs).toBe(before.mtimeMs);
  });

  test('an account whose credential is gone is named and left standing', async () => {
    const home = await aStoreHolding(vaultHolding([]), ['c-missing']);

    const settled = await reconcileVault(home, () => undefined);

    expect(settled.dangling).toEqual(['acc-0']);
    await expect(rowsWritten(home)).resolves.toBe(1);
  });

  test('a home with neither file settles quietly rather than refusing', async () => {
    const home = await mkdtemp(join(tmpdir(), 'recompose-vault-bare-'));

    await expect(reconcileVault(home, () => undefined)).resolves.toEqual({
      swept: [],
      dangling: [],
      notes: [],
    });
  });
});

describe('what a boot is given to say', () => {
  test('a sweep always leaves a sentence, so a lightened store is never silent', async () => {
    const home = await aStoreHolding(vaultHolding(['c-1', 'c-orphan']), ['c-1']);

    const settled = await reconcileVault(home, () => undefined);

    expect(settled.notes).toEqual(['swept 1 vault entries no account reached']);
  });

  test('an account whose credential is gone is named in the sentence', async () => {
    const home = await aStoreHolding(vaultHolding([]), ['c-missing']);

    const settled = await reconcileVault(home, () => undefined);

    expect(settled.notes).toEqual(['accounts whose credential is gone: acc-0']);
  });

  test('a store diverged both ways says both things', async () => {
    const home = await aStoreHolding(vaultHolding(['c-orphan']), ['c-missing']);

    const settled = await reconcileVault(home, () => undefined);

    expect(settled.notes).toHaveLength(2);
  });

  test('a store that agrees leaves nothing to say', async () => {
    const home = await aStoreHolding(vaultHolding(['c-1']), ['c-1']);

    const settled = await reconcileVault(home, () => undefined);

    expect(settled.notes).toEqual([]);
  });
});
