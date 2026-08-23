import type { AccountsDocument, CredentialedAccount, IpcRequest } from '@recompose/contracts';

import { randomUUID } from 'node:crypto';

import type { StorageIpcContext, StoragePaths } from './storage-context';

import { amendAccountsFile, loadAccountsFile } from '../storage/accounts-store';
import { deleteSecret, saveVaultFile, setSecret, type VaultDocument } from '../storage/vault';
import { openVaultForWrite } from './open-vault';
import { ipcFailure, storageFailure } from './storage-envelope';

/**
 * The reference a read-only credential is sealed under, spelled apart from a spending one.
 *
 * @summary The two prefixes let a person reading a vault dump tell which entry a request could
 * ever be served with, without holding the registry beside it.
 */
export function readerRef(): string {
  return `read-${randomUUID()}`;
}

function credentialedRowIn(
  accounts: AccountsDocument,
  id: string,
): CredentialedAccount | undefined {
  return accounts.accounts.find(
    (held): held is CredentialedAccount =>
      held.id === id && (held.kind === 'api-key' || held.kind === 'aggregator'),
  );
}

type HeldRow =
  | { ok: true; row: CredentialedAccount; stored: AccountsDocument }
  | ReturnType<typeof ipcFailure>;

async function heldCredentialedRow(
  ctx: StorageIpcContext,
  paths: StoragePaths,
  id: string,
): Promise<HeldRow> {
  const stored = await loadAccountsFile(paths.accountsFile, ctx.onCorrupt);
  const row = credentialedRowIn(stored, id);

  return row === undefined
    ? ipcFailure('storage-failed', `no account holding a key is held under ${id}.`)
    : { ok: true as const, row, stored };
}

async function amendCredentialedRow(
  paths: StoragePaths,
  onCorrupt: (quarantinedPath: string) => void,
  id: string,
  rewrite: (row: CredentialedAccount) => CredentialedAccount,
): Promise<AccountsDocument> {
  return amendAccountsFile(paths.accountsFile, onCorrupt, (accounts) => ({
    ...accounts,
    accounts: accounts.accounts.map((row) =>
      row.id === id && (row.kind === 'api-key' || row.kind === 'aggregator') ? rewrite(row) : row,
    ),
  }));
}

function withoutHeldReader(vault: VaultDocument, row: CredentialedAccount): VaultDocument {
  return row.readerCredentialRef === undefined
    ? vault
    : deleteSecret(vault, row.readerCredentialRef);
}

function forgetReader(row: CredentialedAccount): CredentialedAccount {
  const kept: CredentialedAccount = { ...row };

  delete kept.readerCredentialRef;

  return kept;
}

/**
 * Holds a read-only key against a row that already exists, replacing whatever it held.
 *
 * @summary The key it replaces leaves the vault in the same write that seals its successor, so no
 * moment exists where two reader secrets stand for one account. The reference is minted fresh
 * rather than reused, which is what keeps a half-finished write from leaving the row pointing at a
 * secret that never landed.
 */
export async function setReaderCredential(
  ctx: StorageIpcContext,
  paths: StoragePaths,
  request: IpcRequest<'accounts:set-reader-key'>,
) {
  try {
    const held = await heldCredentialedRow(ctx, paths, request.id);

    if (!held.ok) {
      return held;
    }

    const opened = await openVaultForWrite(ctx, paths);

    if (!opened.ok) {
      return opened;
    }

    const readerCredentialRef = readerRef();
    const kept = withoutHeldReader(opened.vault, held.row);

    await saveVaultFile(
      paths.vaultFile,
      setSecret(kept, ctx.getCodec(), readerCredentialRef, request.secret),
    );

    return {
      ok: true as const,
      value: await amendCredentialedRow(paths, ctx.onCorrupt, request.id, (row) => ({
        ...row,
        readerCredentialRef,
      })),
    };
  } catch (error) {
    return storageFailure(error, ctx.homeFolder);
  }
}

/**
 * Forgets the read-only key a row held, leaving the key it serves requests with alone.
 *
 * @summary A row holding none is answered rather than refused, because a person clearing a field
 * that is already empty asked for the state it is already in.
 */
export async function clearReaderCredential(
  ctx: StorageIpcContext,
  paths: StoragePaths,
  request: IpcRequest<'accounts:clear-reader-key'>,
) {
  try {
    const held = await heldCredentialedRow(ctx, paths, request.id);

    if (!held.ok) {
      return held;
    }

    if (held.row.readerCredentialRef === undefined) {
      return { ok: true as const, value: held.stored };
    }

    const opened = await openVaultForWrite(ctx, paths);

    if (!opened.ok) {
      return opened;
    }

    await saveVaultFile(paths.vaultFile, deleteSecret(opened.vault, held.row.readerCredentialRef));

    return {
      ok: true as const,
      value: await amendCredentialedRow(paths, ctx.onCorrupt, request.id, forgetReader),
    };
  } catch (error) {
    return storageFailure(error, ctx.homeFolder);
  }
}
