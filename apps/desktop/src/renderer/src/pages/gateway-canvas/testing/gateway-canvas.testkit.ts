import type {
  Account,
  AccountsDocument,
  EngineStates,
  GatewayConfig,
  LogRow,
} from '@recompose/contracts';

import { ACCOUNTS_VERSION } from '@recompose/contracts';

import type { BridgeParameters } from '../../../shared/testing';

import { gatewaySeed } from '../../../shared/testing';
import { emptyDefinition } from '../lib/model-draft';
import { leaveDrafting, startDrafting } from '../lib/use-held-draft';

const claudeSubscription: Account = {
  id: 's1',
  provider: 'anthropic',
  kind: 'subscription',
  provenance: 'sign-in',
  label: 'Claude',
};

/** The stored key the seeded requests are served through, which a row names as their account. */
export const workKey: Account = {
  id: 'k1',
  provider: 'anthropic',
  kind: 'api-key',
  label: 'work',
  credentialRef: 'c1',
};

const openrouterAccount: Account = {
  id: 'g1',
  provider: 'openrouter',
  kind: 'aggregator',
  label: 'openrouter',
  credentialRef: 'c2',
};

const ollamaRuntime: Account = {
  id: 'l1',
  provider: 'ollama',
  kind: 'local',
  address: 'http://127.0.0.1:11434',
};

/**
 * A registry holding one account of every kind, which is what the target picker is read against.
 *
 * @summary One registry serves every story on this surface, so a scenario that cares about a kind
 * says so by what it asserts rather than by seeding its own registry and drifting from the others.
 */
export const storedAccounts: AccountsDocument = {
  schemaVersion: ACCOUNTS_VERSION,
  accounts: [claudeSubscription, workKey, openrouterAccount, ollamaRuntime],
};

/** The same registry after one target left it, which a serving definition has to survive. */
export function accountsWithout(id: string): AccountsDocument {
  return { ...storedAccounts, accounts: storedAccounts.accounts.filter((held) => held.id !== id) };
}

/** A gateway serving two virtual models, one bound to a key and one to an aggregator. */
export const servingGateway: GatewayConfig = gatewaySeed({
  slug: 'my-gateway',
  displayName: 'My Gateway',
  port: 8397,
  virtualModels: [
    {
      id: 'fast',
      displayName: 'Fast',
      target: { accountId: 'k1', providerModel: 'claude-haiku-4-5' },
    },
    {
      id: 'creative',
      displayName: 'Creative',
      target: { accountId: 'g1', providerModel: 'openai/gpt-5' },
    },
  ],
});

/** A gateway nobody has defined anything on yet, which every gateway starts as. */
export const freshGateway: GatewayConfig = gatewaySeed({
  slug: 'my-gateway',
  displayName: 'My Gateway',
  port: 8397,
});

/** The lifecycle snapshot of a gateway that is answering. */
export const runningGateway: EngineStates = { 'my-gateway': { status: 'running' } };

/** The model ids the stored key answers a look with. */
export const listedModels = { k1: ['claude-haiku-4-5', 'claude-sonnet-5', 'claude-opus-5'] };

/** The whole serving world as one bridge seeding, which every canvas scenario opens on. */
export const servingBridgeWorld: BridgeParameters = {
  accounts: storedAccounts,
  gateways: [servingGateway],
  engineStates: runningGateway,
  providerModels: listedModels,
};

/** The wall clock a seeded request is stamped at, read as `14:22:09` wherever a row prints it. */
export const SERVED_AT = new Date(2026, 7, 10, 14, 22, 9).getTime();

const A_CLIENT = `sha256:${'a'.repeat(64)}`;

/**
 * One request the serving gateway answered, which every drawer scenario reads rows from.
 *
 * @summary The seed answers under `fast` through the stored key, so a row reads against the same
 * world the canvas is composed from and a scenario says what it cares about by what it overrides.
 */
export function servedRequest(differing: Partial<LogRow> = {}): LogRow {
  return {
    id: 'served-1',
    at: SERVED_AT,
    gateway: 'my-gateway',
    virtualModel: 'fast',
    origin: 'provider',
    method: 'POST',
    provider: 'anthropic',
    accountId: 'k1',
    providerModel: 'claude-haiku-4-5',
    status: 200,
    durationMs: 900,
    tokens: 1200,
    clientKey: A_CLIENT,
    ...differing,
  };
}

/**
 * A run of served requests, newest first, the way the renderer cache holds them.
 *
 * @summary Each request lands a second before the one ahead of it and carries its own id, so a
 * scenario about order or about a stable key never has to spell either out.
 */
export function servedRun(count: number, differing: Partial<LogRow> = {}): readonly LogRow[] {
  return Array.from({ length: count }, (_unused, seat) =>
    servedRequest({ id: `served-${String(seat + 1)}`, at: SERVED_AT - seat * 1000, ...differing }),
  );
}

/**
 * A history spanning both virtual models, with a refusal and a failure among the answers.
 *
 * @summary The three leading rows differ in model, provider, and status, and the run behind them
 * fills the drawer past its first screen, so scrolling and filtering both have something to bite.
 */
export const servedAcrossTwoModels: readonly LogRow[] = [
  servedRequest({ id: 'a', virtualModel: 'fast' }),
  servedRequest({
    id: 'b',
    at: servedRequest().at - 1000,
    virtualModel: 'creative',
    provider: 'openrouter',
    accountId: 'g1',
    providerModel: 'openai/gpt-5',
    status: 429,
  }),
  servedRequest({
    id: 'c',
    at: servedRequest().at - 2000,
    virtualModel: 'fast',
    status: 500,
    durationMs: undefined,
  }),
  ...servedRun(30).map((row) => ({ ...row, id: `older-${row.id}`, at: row.at - 10_000 })),
];

/**
 * Stands a draft on the serving gateway, and hands back the act that lets it go.
 *
 * @summary Reach for it in a story or a spec about the draft subject, so the draft arrives the
 * way the canvas would have born it: a definition held with a seat, keyed under the gateway.
 */
export function draftedOnMyGateway(displayName = '', id = ''): () => void {
  startDrafting('my-gateway', { ...emptyDefinition(), displayName, id }, { x: 320, y: 140 });

  return () => {
    leaveDrafting('my-gateway');
  };
}
