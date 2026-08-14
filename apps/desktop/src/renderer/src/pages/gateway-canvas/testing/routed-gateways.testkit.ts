import type { GatewayConfig, Routing, VirtualModel } from '@recompose/contracts';

import { gatewaySeed } from '../../../shared/testing';
import { listedModels, storedAccounts } from './gateway-canvas.testkit';

const HAIKU = { kind: 'target', accountId: 'k1', providerModel: 'claude-haiku-4-5' } as const;

const GPT = { kind: 'target', accountId: 'g1', providerModel: 'openai/gpt-5' } as const;

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

const nestedGateway: GatewayConfig = pooledSeed({
  r1: { kind: 'router', policy: { mode: 'failover' }, children: ['t1', 'r2'] },
  t1: HAIKU,
  r2: { kind: 'router', policy: { mode: 'round-robin' }, children: ['t2'] },
  t2: GPT,
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
