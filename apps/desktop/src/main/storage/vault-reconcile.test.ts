import type { AccountsDocument } from '@recompose/contracts';

import { ACCOUNTS_VERSION } from '@recompose/contracts';
import { describe, expect, test } from 'vitest';

import type { VaultDocument } from './vault';

import { reconciledVault } from './vault-reconcile';

function accountsHolding(refs: readonly string[]): AccountsDocument {
  return {
    schemaVersion: ACCOUNTS_VERSION,
    accounts: refs.map((ref, seat) => ({
      id: `acc-${String(seat)}`,
      provider: 'anthropic',
      kind: 'api-key' as const,
      label: `key ${String(seat)}`,
      credentialRef: ref,
    })),
  };
}

/** A local runtime, which is the row that holds no credential because it never needs one. */
function aLocalRuntimeStands(): AccountsDocument {
  return {
    schemaVersion: ACCOUNTS_VERSION,
    accounts: [
      { id: 'acc-local', provider: 'ollama', kind: 'local', address: 'http://127.0.0.1:11434' },
    ],
  };
}

function vaultHolding(refs: readonly string[]): VaultDocument {
  return {
    schemaVersion: 1,
    entries: Object.fromEntries(refs.map((ref) => [ref, `encrypted-${ref}`])),
  };
}

describe('a vault entry nothing reaches', () => {
  test('an entry no account references is swept, because nothing can ever open it again', () => {
    const settled = reconciledVault(vaultHolding(['c-1', 'c-orphan']), accountsHolding(['c-1']));

    expect(Object.keys(settled.vault.entries)).toEqual(['c-1']);
  });

  test('the sweep names what it took, so a person is never quietly lightened', () => {
    const settled = reconciledVault(vaultHolding(['c-1', 'c-orphan']), accountsHolding(['c-1']));

    expect(settled.swept).toEqual(['c-orphan']);
  });

  test('a vault every entry of which is reached comes back as it stood', () => {
    const held = vaultHolding(['c-1', 'c-2']);

    const settled = reconciledVault(held, accountsHolding(['c-1', 'c-2']));

    expect(settled.vault).toBe(held);
    expect(settled.swept).toEqual([]);
  });

  test('two accounts sharing one entry both hold it, so neither loses it to the other', () => {
    const settled = reconciledVault(vaultHolding(['c-1']), accountsHolding(['c-1', 'c-1']));

    expect(settled.swept).toEqual([]);
  });
});

describe('an account whose credential is gone', () => {
  test('the account is named, so somebody can be told which one stopped working', () => {
    const settled = reconciledVault(vaultHolding([]), accountsHolding(['c-missing']));

    expect(settled.dangling).toEqual(['acc-0']);
  });

  test('the account itself is left exactly where it stands', () => {
    const held = accountsHolding(['c-missing']);

    const settled = reconciledVault(vaultHolding([]), held);

    expect(settled.accounts).toBe(held);
  });

  test('a row that never holds a credential is not dangling, and keeps no entry alive', () => {
    const settled = reconciledVault(vaultHolding(['c-orphan']), aLocalRuntimeStands());

    expect(settled.dangling).toEqual([]);
    expect(settled.swept).toEqual(['c-orphan']);
  });
});

describe('a store with nothing wrong', () => {
  test('an empty vault beside empty accounts settles as itself', () => {
    const held = vaultHolding([]);

    const settled = reconciledVault(held, accountsHolding([]));

    expect(settled).toEqual({
      vault: held,
      accounts: accountsHolding([]),
      swept: [],
      dangling: [],
    });
  });
});
