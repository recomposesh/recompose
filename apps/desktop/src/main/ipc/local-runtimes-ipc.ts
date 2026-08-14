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
  | 'accounts:connect-local'
  | 'accounts:detect-runtime'
  | 'accounts:check-runtime'
  | 'accounts:move-runtime'
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

/**
 * Whether a server other than this row already answers where this row wants to move.
 *
 * @summary A documented runtime stands once, and the row moving is that one, so it can never
 * collide with itself. A server a person addressed themselves stands once per address, so the
 * check is against every other row's address rather than against the runtime.
 */
function anotherServerHolds(accounts: AccountsDocument, moving: string, address: string): boolean {
  return accounts.accounts.some(
    (held) => held.kind === 'local' && held.id !== moving && held.address === address,
  );
}

/**
 * The stored local server under an id, read fresh, with everything standing beside it.
 *
 * @summary Both acts that name a stored row read it this way, so neither can drift from the other
 * on what counts as one. An id naming a key row or nobody at all is the same absence to a caller.
 */
async function theLocalRowUnder(ctx: LocalRuntimesIpcContext, id: string) {
  const stored = await loadAccountsFile(
    storagePathsFor(ctx.userDataPath).accountsFile,
    ctx.onCorrupt,
  );
  const row = stored.accounts.find((held) => held.id === id);

  return row?.kind === 'local' ? { stored, row } : null;
}

function noLocalRuntime(id: string) {
  return ipcFailure('storage-failed', `no local runtime is held under ${id}.`);
}

function movedTo(accounts: AccountsDocument, id: string, address: string): AccountsDocument {
  return {
    ...accounts,
    accounts: accounts.accounts.map((held) => (held.id === id ? { ...held, address } : held)),
  };
}

/**
 * Points a stored runtime at another port, keeping the row it already is.
 *
 * @summary A server's port is where it answers today rather than a fact about the row, so a moved
 * `OLLAMA_HOST` used to mean removing the row and adding it back, losing the name a person gave it.
 * The read and the write share one amend turn, so a move racing another act cannot half-land.
 */
async function moveRuntime(ctx: LocalRuntimesIpcContext, id: string, port: number) {
  try {
    const held = await theLocalRowUnder(ctx, id);

    if (held === null) {
      return noLocalRuntime(id);
    }

    const address = addressOf(held.row.provider, port);

    if (anotherServerHolds(held.stored, id, address)) {
      return ipcFailure('name-conflict', alreadyStandingRefusal(held.row.provider, address));
    }

    return {
      ok: true as const,
      value: await amendAccountsFile(
        storagePathsFor(ctx.userDataPath).accountsFile,
        ctx.onCorrupt,
        (fresh) => (anotherServerHolds(fresh, id, address) ? fresh : movedTo(fresh, id, address)),
      ),
    };
  } catch (error) {
    return storageFailure(error, ctx.homeFolder);
  }
}

async function checkStoredRuntime(ctx: LocalRuntimesIpcContext, id: string) {
  try {
    const held = await theLocalRowUnder(ctx, id);

    return held === null
      ? noLocalRuntime(id)
      : { ok: true as const, value: await ctx.probeRuntime(held.row.address, held.row.provider) };
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
    'accounts:move-runtime': async ({ id, port }) => moveRuntime(ctx, id, port),
  };
}
