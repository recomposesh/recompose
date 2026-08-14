import type { GatewayConfig, RouteNode, Routing } from '@recompose/contracts';

import { GATEWAY_CONFIG_VERSION, routingSchema } from '@recompose/contracts';
import { expect, test } from 'vitest';

import {
  gatewayBindingChild,
  gatewayReordering,
  gatewayRoutingThrough,
  gatewaySwitching,
  routedThroughARouter,
} from './routing-edits';

const bound: Routing = {
  entry: 'seat',
  nodes: { seat: { kind: 'target', accountId: 'a1', providerModel: 'claude-sonnet-5' } },
};

const codex: GatewayConfig = {
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

const spare: RouteNode = { kind: 'target', accountId: 'a2', providerModel: 'claude-opus-5' };

function routingOf(gateway: GatewayConfig, modelId = 'fast'): Routing {
  const held = gateway.virtualModels.find((model) => model.id === modelId);

  if (held === undefined) {
    throw new Error(`the gateway serves no virtual model named "${modelId}"`);
  }

  return held.routing;
}

function routerIn(routing: Routing): string {
  return routing.entry;
}

function childrenOf(routing: Routing, routerId: string): readonly string[] {
  const node = routing.nodes[routerId];

  return node?.kind === 'router' ? node.children : [];
}

test('a fresh router routes through itself and holds no child yet', () => {
  const routing = routedThroughARouter('failover');

  expect(routing.nodes[routing.entry]).toEqual({
    kind: 'router',
    policy: { mode: 'failover' },
    children: [],
  });
});

test('two fresh routers stand under ids of their own, because one rule mints every one', () => {
  expect(routedThroughARouter('failover').entry).not.toBe(routedThroughARouter('failover').entry);
});

test('a fresh router stands as a table the stored shape will serve', () => {
  expect(routingSchema.safeParse(routedThroughARouter('round-robin')).success).toBe(true);
});

test('routing a bound model through a router keeps what it bound as the first child', () => {
  const routing = routingOf(gatewayRoutingThrough(codex, 'fast', 'failover'));
  const ladder = routing.nodes[routing.entry];
  const [first] = childrenOf(routing, routing.entry);

  expect(ladder).toMatchObject({ kind: 'router', policy: { mode: 'failover' } });
  expect(first === undefined ? undefined : routing.nodes[first]).toEqual(bound.nodes['seat']);
});

test('a model routed through a router still parses as a table the gateway can serve', () => {
  const routing = routingOf(gatewayRoutingThrough(codex, 'fast', 'round-robin'));

  expect(routingSchema.safeParse(routing).success).toBe(true);
});

test('routing one model through a router leaves every other model exactly as it stood', () => {
  const routed = gatewayRoutingThrough(codex, 'fast', 'failover');

  expect(routingOf(routed, 'slow')).toEqual(bound);
});

test('routing a model through a router leaves its id and its name alone', () => {
  const routed = gatewayRoutingThrough(codex, 'fast', 'failover');

  expect(routed.virtualModels[0]).toMatchObject({ id: 'fast', displayName: 'Fast' });
});

test('a child bound under a router joins the end of the ladder it already holds', () => {
  const routed = gatewayRoutingThrough(codex, 'fast', 'failover');
  const ladder = routerIn(routingOf(routed));
  const grown = routingOf(gatewayBindingChild(routed, 'fast', ladder, spare));
  const children = childrenOf(grown, ladder);

  expect(children).toHaveLength(2);
  expect(children[1] === undefined ? undefined : grown.nodes[children[1]]).toEqual(spare);
});

test('a router bound as a child nests under the one that named it', () => {
  const routed = gatewayRoutingThrough(codex, 'fast', 'failover');
  const ladder = routerIn(routingOf(routed));
  const nested: RouteNode = { kind: 'router', policy: { mode: 'round-robin' }, children: [] };
  const grown = routingOf(gatewayBindingChild(routed, 'fast', ladder, nested));
  const [, second] = childrenOf(grown, ladder);

  expect(second === undefined ? undefined : grown.nodes[second]).toEqual(nested);
  expect(routingSchema.safeParse(grown).success).toBe(true);
});

test('a child bound under a node that routes nothing leaves the whole gateway as it stood', () => {
  const routed = gatewayRoutingThrough(codex, 'fast', 'failover');
  const ladder = routerIn(routingOf(routed));
  const child = childrenOf(routingOf(routed), ladder)[0] ?? '';

  expect(gatewayBindingChild(routed, 'fast', child, spare)).toEqual(routed);
});

function ladderOfThree(): GatewayConfig {
  const routed = gatewayRoutingThrough(codex, 'fast', 'failover');
  const ladder = routerIn(routingOf(routed));

  return gatewayBindingChild(gatewayBindingChild(routed, 'fast', ladder, spare), 'fast', ladder, {
    kind: 'target',
    accountId: 'a3',
    providerModel: 'claude-haiku-5',
  });
}

test('reordering a ladder moves one child to its new rank and leaves the rest in order', () => {
  const three = ladderOfThree();
  const ladder = routerIn(routingOf(three));
  const before = childrenOf(routingOf(three), ladder);
  const after = childrenOf(routingOf(gatewayReordering(three, 'fast', ladder, 2, 0)), ladder);

  expect(after).toEqual([before[2], before[0], before[1]]);
});

test('reordering a child down the ladder puts it behind the ones it passed', () => {
  const three = ladderOfThree();
  const ladder = routerIn(routingOf(three));
  const before = childrenOf(routingOf(three), ladder);
  const after = childrenOf(routingOf(gatewayReordering(three, 'fast', ladder, 0, 2)), ladder);

  expect(after).toEqual([before[1], before[2], before[0]]);
});

test('reordering to a rank one past the last child moves nothing at all', () => {
  const three = ladderOfThree();
  const ladder = routerIn(routingOf(three));
  const moved = gatewayReordering(three, 'fast', ladder, 0, 3);

  expect(childrenOf(routingOf(moved), ladder)).toEqual(childrenOf(routingOf(three), ladder));
});

test('reordering to a rank past the end of the ladder moves nothing at all', () => {
  const three = ladderOfThree();
  const ladder = routerIn(routingOf(three));
  const moved = gatewayReordering(three, 'fast', ladder, 0, 9);

  expect(childrenOf(routingOf(moved), ladder)).toEqual(childrenOf(routingOf(three), ladder));
});

test('reordering to a rank before the first moves nothing at all', () => {
  const three = ladderOfThree();
  const ladder = routerIn(routingOf(three));
  const moved = gatewayReordering(three, 'fast', ladder, 0, -1);

  expect(childrenOf(routingOf(moved), ladder)).toEqual(childrenOf(routingOf(three), ladder));
});

test('reordering a rank the ladder never held moves nothing at all', () => {
  const three = ladderOfThree();
  const ladder = routerIn(routingOf(three));
  const moved = gatewayReordering(three, 'fast', ladder, 7, 0);

  expect(childrenOf(routingOf(moved), ladder)).toEqual(childrenOf(routingOf(three), ladder));
});

test('an edit naming a route node the table never held leaves the whole gateway as it stood', () => {
  const routed = gatewayRoutingThrough(codex, 'fast', 'failover');

  expect(gatewayBindingChild(routed, 'fast', 'never-minted', spare)).toEqual(routed);
  expect(gatewayReordering(routed, 'fast', 'never-minted', 0, 0)).toEqual(routed);
  expect(gatewaySwitching(routed, 'fast', 'never-minted', 'round-robin')).toEqual(routed);
});

test('switching a router to another mode leaves the children standing under it', () => {
  const routed = gatewayRoutingThrough(codex, 'fast', 'failover');
  const ladder = routerIn(routingOf(routed));
  const spread = routingOf(gatewaySwitching(routed, 'fast', ladder, 'round-robin'));

  expect(spread.nodes[ladder]).toMatchObject({ policy: { mode: 'round-robin' } });
  expect(childrenOf(spread, ladder)).toEqual(childrenOf(routingOf(routed), ladder));
});

test('switching the mode of a node that routes nothing leaves the whole gateway as it stood', () => {
  expect(gatewaySwitching(codex, 'fast', 'seat', 'round-robin')).toEqual(codex);
});

test('an edit naming a model the gateway does not serve leaves the whole gateway as it stood', () => {
  expect(gatewayRoutingThrough(codex, 'unknown', 'failover')).toEqual(codex);
});
