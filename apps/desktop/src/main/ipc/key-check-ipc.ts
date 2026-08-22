import type {
  Account,
  CredentialedAccount,
  KeyCheckReport,
  KeyCustody,
} from '@recompose/contracts';

import type { SecretCodec } from '../storage/safe-storage-codec';
import type { IpcHandlers } from './dispatch';
import type { StoragePaths } from './storage-context';

import { providerOriginOf, servedByAPlugin } from '../engine-host/provider-origin';
import { keyCustodyFor } from '../engine-host/target-custody';
import { loadAccountsFile } from '../storage/accounts-store';
import { getSecret } from '../storage/vault';
import { inVaultOrder } from '../storage/vault-order';
import { openVault } from './open-vault';
import { storagePathsFor } from './storage-context';
import { ipcFailure, storageFailure } from './storage-envelope';

export type KeyCheckIpcContext = {
  userDataPath: string;
  homeFolder: string;
  getCodec: () => SecretCodec;
  onCorrupt: (quarantinedPath: string) => void;
  probe: (origin: string, custody: KeyCustody) => Promise<KeyCheckReport>;
};

export function keyCheckReach(
  reach: Omit<KeyCheckIpcContext, 'probe'>,
  engine: { probe: (origin: string, custody: KeyCustody) => Promise<KeyCheckReport> },
): KeyCheckIpcContext {
  return { ...reach, probe: async (origin, custody) => engine.probe(origin, custody) };
}

type KeyCheckIpcHandlers = Pick<IpcHandlers, 'accounts:check-key'>;

/**
 * The row a check runs against, and where its key is spent.
 *
 * @summary The check reaches the address the account is served at, so a key pasted for any vendor
 * the directory names is checkable, and one pasted against an address a person typed is checked
 * there. A provider recompose reaches nothing for, and one a plugin serves from inside the engine,
 * both leave the check with nowhere to ask.
 */
function checkableAt(row: CredentialedAccount) {
  const origin = providerOriginOf(row);

  if (origin === undefined || servedByAPlugin(origin)) {
    return ipcFailure(
      'validation-failed',
      `recompose has no key check for the provider "${row.provider}".`,
    );
  }

  return { ok: true as const, account: row, origin };
}

function holdsAKey(row: Account | undefined): row is CredentialedAccount {
  return row !== undefined && (row.kind === 'api-key' || row.kind === 'aggregator');
}

async function checkableRow(ctx: KeyCheckIpcContext, paths: StoragePaths, id: string) {
  const accounts = await loadAccountsFile(paths.accountsFile, ctx.onCorrupt);
  const row = accounts.accounts.find((candidate) => candidate.id === id);

  return holdsAKey(row)
    ? checkableAt(row)
    : ipcFailure('storage-failed', `no key account is held under ${id}.`);
}

async function decryptedSecret(ctx: KeyCheckIpcContext, paths: StoragePaths, id: string) {
  const row = await checkableRow(ctx, paths, id);

  if (!row.ok) {
    return row;
  }

  const opened = await openVault(paths.vaultFile, ctx.onCorrupt, ctx.homeFolder);

  if (!opened.ok) {
    return opened;
  }

  const secret = getSecret(opened.vault, ctx.getCodec(), row.account.credentialRef);

  if (secret === undefined) {
    return ipcFailure('storage-failed', 'the vault holds no secret for this account.');
  }

  return { ok: true as const, origin: row.origin, custody: keyCustodyFor(row.account, secret) };
}

export function createKeyCheckIpcHandlers(ctx: KeyCheckIpcContext): KeyCheckIpcHandlers {
  const paths = storagePathsFor(ctx.userDataPath);

  return {
    'accounts:check-key': async (request) => {
      let gathered;

      try {
        gathered = await inVaultOrder(async () => decryptedSecret(ctx, paths, request.id));
      } catch (error) {
        return storageFailure(error, ctx.homeFolder);
      }

      if (!gathered.ok) {
        return gathered;
      }

      try {
        return { ok: true as const, value: await ctx.probe(gathered.origin, gathered.custody) };
      } catch (error) {
        return storageFailure(error, ctx.homeFolder);
      }
    },
  };
}
