import type { AccountsDocument, EngineStates, GatewayConfig } from '@recompose/contracts';

import { ACCOUNTS_VERSION } from '@recompose/contracts';

import type { BridgeParameters } from '../../../shared/testing';

import { gatewaySeed } from '../../../shared/testing';
import { emptyDefinition } from '../lib/model-draft';
import { leaveDrafting, startDrafting } from '../lib/use-held-draft';

/**
 * A registry holding one account of every kind, which is what the target picker is read against.
 *
 * @summary One registry serves every story on this surface, so a scenario that cares about a kind
 * says so by what it asserts rather than by seeding its own registry and drifting from the others.
 */
export const storedAccounts: AccountsDocument = {
  schemaVersion: ACCOUNTS_VERSION,
  accounts: [
    { id: 's1', provider: 'anthropic', kind: 'subscription', label: 'Claude' },
    { id: 'k1', provider: 'anthropic', kind: 'api-key', label: 'work', credentialRef: 'c1' },
    {
      id: 'g1',
      provider: 'openrouter',
      kind: 'aggregator',
      label: 'openrouter',
      credentialRef: 'c2',
    },
    { id: 'l1', provider: 'ollama', kind: 'local', address: 'http://127.0.0.1:11434' },
  ],
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
