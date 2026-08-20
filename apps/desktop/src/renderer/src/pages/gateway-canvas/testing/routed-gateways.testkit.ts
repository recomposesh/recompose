import type {
  Account,
  AccountsDocument,
  GatewayConfig,
  RouteNode,
  Routing,
  VirtualModel,
} from '@recompose/contracts';

import { gatewaySeed } from '../../../shared/testing';
import { listedModels, storedAccounts } from './gateway-canvas.testkit';

const HAIKU = { kind: 'target', accountId: 'k1', providerModel: 'claude-haiku-4-5' } as const;

const GPT = { kind: 'target', accountId: 'g1', providerModel: 'openai/gpt-5' } as const;

/** A second Anthropic key, so a pool can hold two accounts one provider product would name alike. */
const spareKey: Account = {
  id: 'k2',
  provider: 'anthropic',
  kind: 'api-key',
  label: 'spare',
  credentialRef: 'c3',
};

const SPARE_HAIKU = { kind: 'target', accountId: 'k2', providerModel: 'claude-haiku-4-5' } as const;

function pooledSeed(nodes: Routing['nodes'], besides: readonly VirtualModel[] = []): GatewayConfig {
  return gatewaySeed({
    slug: 'my-gateway',
    displayName: 'My Gateway',
    port: 8397,
    virtualModels: [
      { id: 'pooled', displayName: 'Pooled', routing: { entry: 'r1', nodes } },
      ...besides,
    ],
  });
}

/** A pooled definition failing over between two accounts, beside one plainly bound to a key. */
export const pooledGateway: GatewayConfig = pooledSeed(
  {
    r1: { kind: 'router', policy: { mode: 'failover' }, children: ['t1', 't2'] },
    t1: HAIKU,
    t2: GPT,
  },
  [{ id: 'fast', displayName: 'Fast', routing: { entry: 'f1', nodes: { f1: HAIKU } } }],
);

/** A pool whose second child is a router of its own, for the scenarios about a nested ladder. */
export const nestedGateway: GatewayConfig = pooledSeed({
  r1: { kind: 'router', policy: { mode: 'failover' }, children: ['t1', 'r2'] },
  t1: HAIKU,
  r2: { kind: 'router', policy: { mode: 'round-robin' }, children: ['t2'] },
  t2: GPT,
});

/**
 * The registry the collision scenarios read against, holding two keys of the one provider.
 *
 * @summary Pooling several accounts of one vendor under one name is what a router is for, so a
 * fixture giving every child its own provider can never render the collision that shape creates.
 */
export const twoKeysOneProvider: AccountsDocument = {
  ...storedAccounts,
  accounts: [...storedAccounts.accounts, spareKey],
};

/**
 * A pool whose two children differ in nothing a provider product or a real model would tell apart.
 *
 * @summary Both children answer under one vendor and serve one real model, so the account is the
 * only fact standing between them and a row naming anything else names both rows the same.
 */
export const oneProviderPool: GatewayConfig = pooledSeed({
  r1: { kind: 'router', policy: { mode: 'failover' }, children: ['t1', 't2'] },
  t1: HAIKU,
  t2: SPARE_HAIKU,
});

/** A definition routed through a router nobody has filled, which a plus binds the first child of. */
const emptyRouterGateway: GatewayConfig = pooledSeed({
  r1: { kind: 'router', policy: { mode: 'failover' }, children: [] },
});

/**
 * A router a judge decides: one worded branch, an else child, and the judge the policy names.
 *
 * @summary The canvas scenarios stand it on a gateway and the inspector stories stand it on their
 * own model, so the policy is written once rather than drifting between the two surfaces.
 */
export const judgedRouter = {
  kind: 'router',
  policy: {
    mode: 'conditional',
    judge: 'j1',
    branches: [{ label: 'code', rule: 'questions about source code', child: 't1' }],
    elseChild: 't2',
    judgeBoundMs: 3000,
    rejudgeEveryRequest: false,
  },
  children: ['t1', 't2'],
} as const satisfies RouteNode;

/** The pooled router in each spreading mode, which the inspector readings stand one of. */
export const pooledFailover = {
  kind: 'router',
  policy: { mode: 'failover' },
  children: ['t1', 't2'],
} as const satisfies RouteNode;

/** The same pool spreading round-robin, so a reading about the other mode changes nothing else. */
export const pooledRotating = {
  ...pooledFailover,
  policy: { mode: 'round-robin' },
} as const satisfies RouteNode;

/**
 * The model every inspector reading stands on, holding the judge only where a policy names one.
 *
 * @summary A judge node under a router that never reads its requests would be a node no reference
 * reaches, which is a table the stored shape refuses, so it arrives only with the mode that names it.
 */
export function pooledModel(router: RouteNode, judged = false): VirtualModel {
  return {
    id: 'pooled',
    displayName: 'Pooled',
    routing: {
      entry: 'r1',
      nodes: { r1: router, t1: HAIKU, t2: GPT, ...(judged ? { j1: HAIKU } : {}) },
    },
  };
}

/** The pool standing alone as a gateway, for the readings that hold one router and nothing else. */
export const pooledOnlyGateway: GatewayConfig = pooledSeed({
  r1: pooledFailover,
  t1: HAIKU,
  t2: GPT,
});

/** A pool that judge decides, standing beside the judge target its policy names. */
const judgedGateway: GatewayConfig = pooledSeed({
  r1: judgedRouter,
  t1: HAIKU,
  t2: GPT,
  j1: HAIKU,
});

/** The pooled composition as a whole bridge seeding, which every router scenario opens on. */
export const pooledWorld = {
  accounts: storedAccounts,
  gateways: [pooledGateway],
  providerModels: listedModels,
};

/** The nested composition as a whole bridge seeding, for the scenarios about a router's router. */
export const nestedWorld = {
  accounts: storedAccounts,
  gateways: [nestedGateway],
  providerModels: listedModels,
};

/** The unfilled router as a whole bridge seeding, for the scenarios about binding a first child. */
export const emptyRouterWorld = {
  accounts: storedAccounts,
  gateways: [emptyRouterGateway],
  providerModels: listedModels,
};

/** The judged composition as a whole bridge seeding, for the scenarios about leaving conditional. */
export const judgedWorld = {
  accounts: storedAccounts,
  gateways: [judgedGateway],
  providerModels: listedModels,
};
