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

function judgedOver(branchChild: string, elseChild: string): RouteNode {
  return {
    kind: 'router',
    policy: {
      mode: 'conditional',
      judge: 'j1',
      branches: [{ label: 'code', rule: 'questions about source code', child: branchChild }],
      elseChild,
      judgeBoundMs: 3000,
      rejudgeEveryRequest: false,
    },
    children: [branchChild, elseChild],
  };
}

function servedAs(entry: string, nodes: Routing['nodes']): GatewayConfig {
  return {
    ...codex,
    virtualModels: [
      { id: 'fast', displayName: 'Fast', routing: { entry, nodes } },
      { id: 'slow', displayName: 'Slow', routing: bound },
    ],
  };
}

const JUDGE: RouteNode = { kind: 'target', accountId: 'a3', providerModel: 'claude-haiku-5' };

/**
 * A conditional router over two children: `c1` under the `code` branch, and `c2` as its else.
 *
 * @summary Written out rather than built by the edits under test, so a scenario about an edit reads
 * against a table nobody edited into shape.
 */
export function judged(): GatewayConfig {
  return servedAs('r1', {
    r1: judgedOver('c1', 'c2'),
    c1: { kind: 'target', accountId: 'a1', providerModel: 'claude-sonnet-5' },
    c2: { kind: 'target', accountId: 'a2', providerModel: 'claude-opus-5' },
    j1: JUDGE,
  });
}

/**
 * Two conditional routers under one ladder, `r1` and `r2`, both asking the judge `j1`.
 *
 * @summary The stored shape allows one judge to advise several routers, so an edit that moves one
 * of them has to leave the other's policy standing on a node the table still holds.
 */
export function sharingOneJudge(): GatewayConfig {
  return servedAs('top', {
    top: { kind: 'router', policy: { mode: 'failover' }, children: ['r1', 'r2'] },
    r1: judgedOver('c1', 'e1'),
    r2: judgedOver('c2', 'e2'),
    c1: { kind: 'target', accountId: 'a1', providerModel: 'claude-sonnet-5' },
    e1: { kind: 'target', accountId: 'a2', providerModel: 'claude-opus-5' },
    c2: { kind: 'target', accountId: 'a4', providerModel: 'claude-haiku-5' },
    e2: { kind: 'target', accountId: 'a5', providerModel: 'claude-sonnet-5' },
    j1: JUDGE,
  });
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
