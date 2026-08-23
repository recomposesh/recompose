import type {
  Account,
  AccountsDocument,
  IpcRequest,
  KeyCheckVerdict,
  RecomposeIpc,
  RuntimeReachability,
  SubscriptionAccountView,
} from '@recompose/contracts';

import {
  ACCOUNTS_VERSION,
  keyTail,
  loopbackAddressAt,
  runtimeAddressFor,
  runtimePortSchema,
  subscriptionPlanNames,
} from '@recompose/contracts';

type ReaderKeySet = (id: string, held: boolean) => AccountsDocument;

/**
 * Stands a read-only credential on one row, or takes it away, as the real acts do.
 *
 * @summary A reference rather than a secret, because the fake registry holds what the real one
 * holds and the vault behind it is the only place a secret ever lives.
 */
function withReaderKey(registry: AccountsDocument, id: string, held: boolean): AccountsDocument {
  return {
    ...registry,
    accounts: registry.accounts.map((row) =>
      row.id === id && row.kind !== 'subscription' && row.kind !== 'local'
        ? { ...row, ...(held ? { readerCredentialRef: 'read-fake' } : {}) }
        : row,
    ),
  };
}

/** The two acts that stand a read-only credential on a row or take it away again. */
function readerKeyActs(
  set: ReaderKeySet,
): Pick<RecomposeIpc, 'accounts:set-reader-key' | 'accounts:clear-reader-key'> {
  return {
    'accounts:set-reader-key': async ({ id }) =>
      Promise.resolve({ ok: true, value: set(id, true) }),
    'accounts:clear-reader-key': async ({ id }) =>
      Promise.resolve({ ok: true, value: set(id, false) }),
  };
}

/** A registry nobody has connected anything to, which every install starts as. */
export const noAccounts: AccountsDocument = { schemaVersion: ACCOUNTS_VERSION, accounts: [] };

type AccountHandlers = Pick<
  RecomposeIpc,
  | 'accounts:list'
  | 'accounts:connect'
  | 'accounts:remove'
  | 'accounts:check-key'
  | 'accounts:set-reader-key'
  | 'accounts:clear-reader-key'
  | 'accounts:connect-local'
  | 'accounts:detect-runtime'
  | 'accounts:check-runtime'
  | 'accounts:move-runtime'
>;

type RuntimeLookHandlers = Pick<RecomposeIpc, 'accounts:detect-runtime' | 'accounts:check-runtime'>;

type AccountsHalf = AccountHandlers & {
  landSubscription: (id: string, provider: SubscriptionAccountView['provider']) => void;
};

function keyRow(id: string, request: IpcRequest<'accounts:connect'>): Account {
  const tail = keyTail(request.secret);

  return {
    id,
    provider: request.provider,
    kind: request.kind,
    label: request.label,
    credentialRef: `c-${id}`,
    ...(tail === undefined ? {} : { keyTail: tail }),
    ...(request.endpoint === undefined ? {} : { endpoint: request.endpoint }),
  };
}

function fakeAddress(request: IpcRequest<'accounts:connect-local'>): string {
  const port = runtimePortSchema.optional().parse(request.port);

  return request.runtime === 'custom'
    ? loopbackAddressAt(port ?? 8000)
    : runtimeAddressFor(request.runtime, port);
}

function localRow(id: string, request: IpcRequest<'accounts:connect-local'>): Account {
  const row = {
    id,
    provider: request.runtime,
    kind: 'local' as const,
    address: fakeAddress(request),
  };

  return request.label === undefined ? row : { ...row, label: request.label };
}

/**
 * The two looks a runtime answers, neither of which the registry keeps.
 *
 * @summary A scenario decides what the machine says this run, so both looks answer the one seeded
 * reading rather than the fake deciding, and neither stores it.
 */
function runtimeLookHandlers(reachability: RuntimeReachability): RuntimeLookHandlers {
  return {
    'accounts:detect-runtime': async () => Promise.resolve({ ok: true, value: reachability }),
    'accounts:check-runtime': async () => Promise.resolve({ ok: true, value: reachability }),
  };
}

/**
 * The accounts half of the fake bridge, holding the registry every kind reads.
 *
 * @summary The real main grows this registry when a sign-in lands, so the fake exposes the same
 * growth through landSubscription, and a screen that never re-asks the registry stays caught. A
 * connect mints the mask tail the way main does, and the check answers the verdict the scenario
 * seeded. A local connect mints the loopback address around the chosen port the way main does, so
 * no scenario can supply one.
 */
/** A stored runtime pointed at another port, keeping the row and everything else about it. */
function withRuntimeMoved(held: AccountsDocument, id: string, port: number): AccountsDocument {
  return {
    ...held,
    accounts: held.accounts.map((row) =>
      row.id === id && row.kind === 'local'
        ? { ...row, address: `http://127.0.0.1:${String(port)}` }
        : row,
    ),
  };
}

/**
 * The one registry every fake act reads and writes, so a scenario sees its own connects.
 *
 * @summary The mutators live together rather than inside the handler map, because they share one
 * piece of state and a handler map that also held them would be the only thing in this file a
 * reader had to hold two ideas about at once.
 */
function registryDesk(seed: AccountsDocument) {
  let registry = seed;
  let nextAccountNumber = registry.accounts.length + 1;

  return {
    held: () => registry,
    append: (row: Account): AccountsDocument => {
      registry = { ...registry, accounts: [...registry.accounts, row] };

      return registry;
    },
    moved: (id: string, port: number): AccountsDocument => {
      registry = withRuntimeMoved(registry, id, port);

      return registry;
    },
    forgotten: (id: string): AccountsDocument => {
      registry = { ...registry, accounts: registry.accounts.filter((row) => row.id !== id) };

      return registry;
    },
    readerKeySet: (id: string, standing: boolean): AccountsDocument => {
      registry = withReaderKey(registry, id, standing);

      return registry;
    },
    nextId: (): string => {
      const id = `a${nextAccountNumber}`;

      nextAccountNumber += 1;

      return id;
    },
  };
}

export function accountHandlers(
  seed: AccountsDocument,
  verdict: KeyCheckVerdict,
  reachability: RuntimeReachability,
): AccountsHalf {
  const { append, moved, forgotten, readerKeySet, nextId, held } = registryDesk(seed);

  const localRuntimeActs = {
    'accounts:connect-local': async (request: IpcRequest<'accounts:connect-local'>) =>
      Promise.resolve({ ok: true as const, value: append(localRow(nextId(), request)) }),
    'accounts:move-runtime': async ({ id, port }: IpcRequest<'accounts:move-runtime'>) =>
      Promise.resolve({ ok: true as const, value: moved(id, port) }),
  };

  return {
    ...localRuntimeActs,
    ...runtimeLookHandlers(reachability),
    landSubscription: (id, provider) => {
      append({
        id,
        provider,
        kind: 'subscription',
        provenance: 'sign-in',
        label: subscriptionPlanNames[provider],
      });
    },
    'accounts:list': async () => Promise.resolve({ ok: true, value: held() }),
    'accounts:connect': async (request) =>
      Promise.resolve({ ok: true, value: append(keyRow(nextId(), request)) }),
    'accounts:check-key': async () => Promise.resolve({ ok: true as const, value: { verdict } }),
    'accounts:remove': async ({ id }) => Promise.resolve({ ok: true, value: forgotten(id) }),
    ...readerKeyActs(readerKeySet),
  };
}
