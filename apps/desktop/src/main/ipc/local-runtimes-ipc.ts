import type { AccountsDocument, LocalProviderId, RuntimeReachability } from '@recompose/contracts';

import { localRuntimes, loopbackAddressAt, runtimeAddressFor } from '@recompose/contracts';
import { randomUUID } from 'node:crypto';

import type { IpcHandlers } from './dispatch';

import { amendAccountsFile, loadAccountsFile } from '../storage/accounts-store';
import { storagePathsFor } from './storage-context';
import { ipcFailure, storageFailure } from './storage-envelope';

export type LocalRuntimesIpcContext = {
  userDataPath: string;
  homeFolder: string;
  onCorrupt: (quarantinedPath: string) => void;
  probeRuntime: (address: string, provider: LocalProviderId) => Promise<RuntimeReachability>;
};

type LocalRuntimesIpcHandlers = Pick<
  IpcHandlers,
  'accounts:connect-local' | 'accounts:detect-runtime' | 'accounts:check-runtime'
>;

function runtimesStandingIn(accounts: AccountsDocument): Set<LocalProviderId> {
  const standing = new Set<LocalProviderId>();

  for (const held of accounts.accounts) {
    if (held.kind === 'local') {
      standing.add(held.provider);
    }
  }

  return standing;
}

/**
 * The loopback address a look aims at, or a stored row holds, for whichever server was named.
 *
 * @summary A documented runtime mints from its own table row, defaulting to the port its project
 * publishes. A server a person addressed themselves has no row to mint from, so the port they gave
 * is the whole of it, and its absence falls back to the one port no documented runtime claims.
 */
function addressOf(provider: LocalProviderId, port: number | undefined): string {
  if (provider !== 'custom') {
    return runtimeAddressFor(provider, port);
  }

  if (port === undefined) {
    throw new Error('a server nobody documents reached the handler without naming its own port');
  }

  return loopbackAddressAt(port);
}

function withTheRuntimeAppended(
  accounts: AccountsDocument,
  runtime: LocalProviderId,
  id: string,
  address: string,
  label: string | undefined,
): AccountsDocument {
  const row = { id, provider: runtime, kind: 'local' as const, address };

  return {
    ...accounts,
    accounts: [...accounts.accounts, label === undefined ? row : { ...row, label }],
  };
}

/**
 * Whether this server already stands as a row, which decides whether a second one may join it.
 *
 * @summary A documented runtime stands once, because its row is the runtime and a second row would
 * name the same server twice. A server a person addressed themselves stands once per address, so a
 * person running two on different ports gets two rows.
 */
function alreadyStanding(
  accounts: AccountsDocument,
  runtime: LocalProviderId,
  address: string,
): boolean {
  if (runtime !== 'custom') {
    return runtimesStandingIn(accounts).has(runtime);
  }

  return accounts.accounts.some((held) => held.kind === 'local' && held.address === address);
}

function alreadyStandingRefusal(runtime: LocalProviderId, address: string): string {
  return runtime === 'custom'
    ? `A local server is already connected at ${address}. Remove the row to point it somewhere else.`
    : `${localRuntimes[runtime].name} is already connected. Remove the row to point it at another port.`;
}

async function connectRuntime(
  ctx: LocalRuntimesIpcContext,
  runtime: LocalProviderId,
  port: number | undefined,
  label: string | undefined,
) {
  const paths = storagePathsFor(ctx.userDataPath);
  const minted = `acc-${randomUUID()}`;
  const address = addressOf(runtime, port);

  try {
    const amended = await amendAccountsFile(paths.accountsFile, ctx.onCorrupt, (fresh) =>
      alreadyStanding(fresh, runtime, address)
        ? fresh
        : withTheRuntimeAppended(fresh, runtime, minted, address, label),
    );

    return amended.accounts.some((held) => held.id === minted)
      ? { ok: true as const, value: amended }
      : ipcFailure('name-conflict', alreadyStandingRefusal(runtime, address));
  } catch (error) {
    return storageFailure(error, ctx.homeFolder);
  }
}

async function checkStoredRuntime(ctx: LocalRuntimesIpcContext, id: string) {
  const paths = storagePathsFor(ctx.userDataPath);

  try {
    const stored = await loadAccountsFile(paths.accountsFile, ctx.onCorrupt);
    const row = stored.accounts.find((held) => held.id === id);

    if (row?.kind !== 'local') {
      return ipcFailure('storage-failed', `no local runtime is held under ${id}.`);
    }

    return { ok: true as const, value: await ctx.probeRuntime(row.address, row.provider) };
  } catch (error) {
    return storageFailure(error, ctx.homeFolder);
  }
}

/**
 * The three channels a local runtime travels, none of which can carry a secret.
 *
 * @summary Detection answers from the loopback address minted around the chosen port, defaulting
 * to the documented one, before anything is stored. Connecting mints that same address here rather
 * than taking one from the renderer, so no stored row can ever name localhost. The renderer's one
 * knob stays the port. The already-standing check and the append share one amend turn, so
 * two racing adds cannot both mint. Nothing on this path opens or references the vault, because a
 * local runtime holds no credential to keep.
 */
export function createLocalRuntimesIpcHandlers(
  ctx: LocalRuntimesIpcContext,
): LocalRuntimesIpcHandlers {
  return {
    'accounts:detect-runtime': async ({ runtime, port }) => ({
      ok: true as const,
      value: await ctx.probeRuntime(addressOf(runtime, port), runtime),
    }),
    'accounts:check-runtime': async ({ id }) => checkStoredRuntime(ctx, id),
    'accounts:connect-local': async ({ runtime, port, label }) =>
      connectRuntime(ctx, runtime, port, label),
  };
}
