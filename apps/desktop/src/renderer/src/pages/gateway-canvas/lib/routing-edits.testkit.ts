import type { GatewayConfig, RouteNode, RouterPolicy, Routing } from '@recompose/contracts';

import { GATEWAY_CONFIG_VERSION } from '@recompose/contracts';

import { gatewayBindingChild, gatewayRoutingThrough } from './routing-edits';

/** One target standing as a whole routing, which is what a direct binding stores as. */
export const bound: Routing = {
  entry: 't1',
  nodes: { t1: { kind: 'target', accountId: 'a1', providerModel: 'claude-sonnet-5' } },
};

/** A gateway serving two plainly bound definitions, which every route edit starts from. */
export const codex: GatewayConfig = {
  schemaVersion: GATEWAY_CONFIG_VERSION,
  slug: 'codex',
  displayName: 'Codex',
  port: 8397,
  virtualModels: [
    { id: 'fast', displayName: 'Fast', routing: bound },
    { id: 'slow', displayName: 'Slow', routing: bound },
  ],
  layout: { nodes: {} },
};

/** A second target to bind, so a scenario about a ladder has something to grow it with. */
export const spare: RouteNode = {
  kind: 'target',
  accountId: 'a2',
  providerModel: 'claude-opus-5',
};

/** The routing one definition of an edited gateway holds. */
export function routingOf(gateway: GatewayConfig, modelId = 'fast'): Routing {
  const held = gateway.virtualModels.find((model) => model.id === modelId);

  if (held === undefined) {
    throw new Error(`the gateway serves no virtual model named "${modelId}"`);
  }

  return held.routing;
}

/** The children one router of a routing holds, or nothing where the node routes nothing. */
export function childrenOf(routing: Routing, routerId: string): readonly string[] {
  const node = routing.nodes[routerId];

  return node?.kind === 'router' ? node.children : [];
}

/** The policy one router of a routing spreads by, or nothing where the node routes nothing. */
export function policyOf(routing: Routing, routerId: string): RouterPolicy | undefined {
  const node = routing.nodes[routerId];

  return node?.kind === 'router' ? node.policy : undefined;
}

/**
 * A conditional router over two children: `c1` under the `code` branch, and `c2` as its else.
 *
 * @summary Written out rather than built by the edits under test, so a scenario about an edit reads
 * against a table nobody edited into shape.
 */
export function judged(): GatewayConfig {
  return {
    ...codex,
    virtualModels: [
      {
        id: 'fast',
        displayName: 'Fast',
        routing: {
          entry: 'r1',
          nodes: {
            r1: {
              kind: 'router',
              policy: {
                mode: 'conditional',
                judge: 'j1',
                branches: [{ label: 'code', rule: 'questions about source code', child: 'c1' }],
                elseChild: 'c2',
                judgeBoundMs: 3000,
                rejudgeEveryRequest: false,
              },
              children: ['c1', 'c2'],
            },
            c1: { kind: 'target', accountId: 'a1', providerModel: 'claude-sonnet-5' },
            c2: { kind: 'target', accountId: 'a2', providerModel: 'claude-opus-5' },
            j1: { kind: 'target', accountId: 'a3', providerModel: 'claude-haiku-5' },
          },
        },
      },
      { id: 'slow', displayName: 'Slow', routing: bound },
    ],
  };
}

/** A failover ladder of three targets under one entry router, named `second` and `third`. */
export function ladderOfThree(): GatewayConfig {
  const routed = gatewayRoutingThrough(codex, 'fast', 'failover');
  const ladder = routingOf(routed).entry;

  return gatewayBindingChild(
    gatewayBindingChild(routed, 'fast', ladder, 'second', spare),
    'fast',
    ladder,
    'third',
    { kind: 'target', accountId: 'a3', providerModel: 'claude-haiku-5' },
  );
}
