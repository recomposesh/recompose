import type { Account, GatewayConfig, RouteNode, Routing } from '@recompose/contracts';

import { vi } from 'vitest';

import type { CanvasNode } from '../../lib/node-graph';
import type { PickerStanding } from './canvas-standings';
import type { CanvasRecord } from './canvas-world.testkit';

import { gatewaySeed } from '../../../../shared/testing';

/** The gateway every router scenario stands on, which is the one the seeded canvas serves. */
export const CANVAS = 'my-gateway';

export const accounts: readonly Account[] = [
  { id: 'k1', provider: 'anthropic', kind: 'api-key', label: 'work', credentialRef: 'c1' },
  { id: 'g1', provider: 'openai', kind: 'api-key', label: 'spare', credentialRef: 'c2' },
];

/** How one stored virtual model routes in the document a gesture wrote. */
export function routingWritten(record: CanvasRecord, modelId: string): Routing | undefined {
  return record.written[0]?.virtualModels.find((model) => model.id === modelId)?.routing;
}

/** Every definition the written gateway still serves, in the order it holds them. */
export function definitionsWritten(record: CanvasRecord): readonly string[] | undefined {
  return record.written[0]?.virtualModels.map((model) => model.id);
}

export function nodeWritten(
  routing: Routing | undefined,
  nodeId: string | undefined,
): RouteNode | undefined {
  return routing === undefined || nodeId === undefined ? undefined : routing.nodes[nodeId];
}

/**
 * The children one route node holds, or nothing where no router stands there.
 *
 * @summary A route node id is minted rather than spelled, so a scenario reads the ladder back off
 * the written document and names the born child by its rank instead of by an id it cannot know.
 */
export function ladderIn(routing: Routing | undefined, routerId: string | undefined) {
  const node = nodeWritten(routing, routerId);

  return node?.kind === 'router' ? node.children : undefined;
}

/** The way one written router spreads the requests reaching it. */
export function modeIn(
  routing: Routing | undefined,
  routerId: string | undefined,
): string | undefined {
  const node = nodeWritten(routing, routerId);

  return node?.kind === 'router' ? node.policy.mode : undefined;
}

/** The ask a cable let go on a stored child opens, which names the child a pick would move. */
export const askOnTheStoredChild: PickerStanding = {
  step: 'provider-model',
  from: 'route:pooled',
  accountId: 'g1',
  anchor: 'target:pooled:t1',
};

/**
 * The frames the canvas asked for so it could look at a card that was just born.
 *
 * @summary A card a person can already see was placed by them rather than born by this write, so
 * whether a look is asked for at all is what tells the two apart from a node scenario.
 */
export function looksAtBornCards(): (() => void)[] {
  const looks: (() => void)[] = [];

  vi.stubGlobal('requestAnimationFrame', (look: () => void) => {
    looks.push(look);

    return 0;
  });

  return looks;
}

/** One target card standing on the canvas under the id its route node address spells. */
export function targetCard(id: string): CanvasNode {
  return {
    id,
    kind: 'target',
    account: {
      id: 'k1',
      provider: 'anthropic',
      kind: 'api-key',
      label: 'work',
      credentialRef: 'c1',
    },
    modelId: 'pooled',
    routeNodeId: 't1',
    depth: 1,
  };
}

/** A gateway whose definition routes through a router standing under another router. */
export function gatewayOfNestedRouters(): GatewayConfig {
  return gatewaySeed({
    slug: CANVAS,
    displayName: 'My Gateway',
    port: 8397,
    virtualModels: [
      {
        id: 'deep',
        displayName: 'Deep',
        routing: {
          entry: 'r1',
          nodes: {
            r1: { kind: 'router', policy: { mode: 'failover' }, children: ['r2'] },
            r2: { kind: 'router', policy: { mode: 'failover' }, children: [] },
          },
        },
      },
    ],
  });
}
