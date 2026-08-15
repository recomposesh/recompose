import type { Account, GatewayConfig } from '@recompose/contracts';

import { gatewaySeed } from '../../../../shared/testing';

/** One stored account, so a target route node has a name to read itself by. */
export const stored: readonly Account[] = [
  { id: 'k1', provider: 'anthropic', kind: 'api-key', label: 'work', credentialRef: 'c1' },
];

/** A gateway deletion nobody asked for, which a scenario about the question never runs. */
export function nothingDeleted(): void {}

/** A gateway a person never named, which has only the slug clients send it. */
export function gatewayNobodyNamed(): GatewayConfig {
  return gatewaySeed({ slug: 'my-gateway', displayName: '', port: 8397 });
}

/** A gateway whose entry router carries a name of its own rather than only a mode. */
export function gatewayWhoseLadderIsNamed(): GatewayConfig {
  return gatewaySeed({
    slug: 'my-gateway',
    displayName: 'My Gateway',
    port: 8397,
    virtualModels: [
      {
        id: 'pooled',
        displayName: 'Pooled',
        routing: {
          entry: 'r1',
          nodes: {
            r1: {
              kind: 'router',
              displayName: 'Ladder',
              policy: { mode: 'failover' },
              children: [],
            },
          },
        },
      },
    ],
  });
}

/** A gateway holding one router nested under another, so a ladder stands below the entry. */
export function gatewayHoldingALadderBelowTheEntry(): GatewayConfig {
  return gatewaySeed({
    slug: 'my-gateway',
    displayName: 'My Gateway',
    port: 8397,
    virtualModels: [
      {
        id: 'nested',
        displayName: 'Nested',
        routing: {
          entry: 'r1',
          nodes: {
            r1: { kind: 'router', policy: { mode: 'failover' }, children: ['r2'] },
            r2: { kind: 'router', policy: { mode: 'round-robin' }, children: [] },
          },
        },
      },
    ],
  });
}
