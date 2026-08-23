import type { Account, AccountsDocument } from '@recompose/contracts';

import type { VaultDocument } from './vault';

export type ReconciledStore = {
  /** The vault as it should stand, which is the one handed in wherever nothing was orphaned. */
  vault: VaultDocument;
  /** The accounts exactly as they stand. Nothing here removes a row a person set up. */
  accounts: AccountsDocument;
  /** The refs swept, named so a sweep is never silent. */
  swept: readonly string[];
  /** The accounts whose credential is gone, named so somebody can be told which stopped working. */
  dangling: readonly string[];
};

function credentialRefOf(account: Account): string | undefined {
  return 'credentialRef' in account ? account.credentialRef : undefined;
}

/**
 * Every vault entry one account reaches, which is what a sweep and a removal both ask for.
 *
 * @summary A credentialed row can hold a read-only credential beside the one it spends, so the
 * answer is a list rather than a single ref. Both callers read it here so a row that grows a third
 * reference can never be swept by one and released by the other.
 */
export function vaultRefsOf(account: Account): readonly string[] {
  const ref = credentialRefOf(account);

  if (ref === undefined) {
    return [];
  }

  const reader = 'readerCredentialRef' in account ? account.readerCredentialRef : undefined;

  return reader === undefined ? [ref] : [ref, reader];
}

function refsReached(accounts: AccountsDocument): Set<string> {
  const reached = new Set<string>();

  for (const account of accounts.accounts) {
    for (const ref of vaultRefsOf(account)) {
      reached.add(ref);
    }
  }

  return reached;
}

/**
 * The two stores read against each other, and the divergence ADR-0018 accepted named.
 *
 * @summary The vault and the account registry are separate files written one after the other, so a
 * failure between the two writes leaves one of two states. ADR-0018 took that bounded window
 * deliberately rather than paying for a transaction across both files, and this is the repair it
 * deferred.
 *
 * The two states are not symmetric, and neither is what happens to them.
 *
 * A vault entry no account reaches can never be opened again: nothing knows its ref, and the
 * document holding it is encrypted. Sweeping it loses nothing that was recoverable and stops the
 * file growing secrets nobody can spend.
 *
 * An account whose credential is gone is the opposite. The row still carries what a person chose:
 * its name, its endpoint, the provider it points at. Removing it would destroy that to repair a
 * missing secret they can paste back in a moment. So this names the row and touches nothing, and
 * the account is left where a person can find and mend it.
 */
export function reconciledVault(vault: VaultDocument, accounts: AccountsDocument): ReconciledStore {
  const reached = refsReached(accounts);
  const swept = Object.keys(vault.entries).filter((ref) => !reached.has(ref));
  const dangling: string[] = [];

  for (const account of accounts.accounts) {
    const ref = credentialRefOf(account);

    if (ref !== undefined && vault.entries[ref] === undefined) {
      dangling.push(account.id);
    }
  }

  if (swept.length === 0) {
    return { vault, accounts, swept, dangling };
  }

  const entries = Object.fromEntries(
    Object.entries(vault.entries).filter(([ref]) => reached.has(ref)),
  );

  return { vault: { ...vault, entries }, accounts, swept, dangling };
}
