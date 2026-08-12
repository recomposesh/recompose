import type { AccountKind } from '@recompose/contracts';

import { loadAccountsFile } from '../storage/accounts-store';

export type AccountKindsDeps = {
  file: string;
  onCorrupt: (quarantinedPath: string) => void;
};

export type AccountKinds = {
  kindOf: (accountId: string | undefined) => AccountKind | undefined;
  refresh: () => Promise<void>;
};

/**
 * The kind each stored account holds today, cached so accrual never reads a file per row.
 *
 * @summary The usage ledger stamps `accountKind` at accrual time, and rows settle far too often
 * to load the registry for each one. The cache reads once at boot and again whenever the accounts
 * watcher says the file moved, which is the same signal every other reader of that file trusts.
 * An account nobody stored answers nothing, which is how a gateway-raised row reads anyway.
 */
export async function openAccountKinds(deps: AccountKindsDeps): Promise<AccountKinds> {
  let kinds = new Map<string, AccountKind>();

  const refresh = async (): Promise<void> => {
    const document = await loadAccountsFile(deps.file, deps.onCorrupt);

    kinds = new Map(document.accounts.map((account) => [account.id, account.kind]));
  };

  await refresh();

  return {
    kindOf: (accountId) => (accountId === undefined ? undefined : kinds.get(accountId)),
    refresh,
  };
}
