import type { RouteNode, RouteTarget } from '@recompose/contracts';

import { routingSchema } from '@recompose/contracts';
import { expect, test } from 'vitest';

import {
  gatewayBindingChild,
  gatewayNamingRouter,
  gatewayRebindingNode,
  gatewayReordering,
  gatewayRoutingThrough,
  gatewaySwitching,
  routedThroughARouter,
} from './routing-edits';
import { bound, childrenOf, codex, ladderOfThree, routingOf, spare } from './routing-edits.testkit';

function routerIn(routing: ReturnType<typeof routingOf>): string {
  return routing.entry;
}

const elsewhere: RouteTarget = {
  kind: 'target',
  accountId: 'a9',
  providerModel: 'claude-sonnet-5',
};

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
  expect(first === undefined ? undefined : routing.nodes[first]).toEqual(bound.nodes['t1']);
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
  const grown = routingOf(gatewayBindingChild(routed, 'fast', ladder, 'second', spare));
  const children = childrenOf(grown, ladder);

  expect(children).toHaveLength(2);
  expect(children[1] === undefined ? undefined : grown.nodes[children[1]]).toEqual(spare);
});

test('a child stands under the id its caller named, so a card can be placed before it exists', () => {
  const routed = gatewayRoutingThrough(codex, 'fast', 'failover');
  const ladder = routerIn(routingOf(routed));
  const grown = routingOf(gatewayBindingChild(routed, 'fast', ladder, 'named-node', spare));

  expect(childrenOf(grown, ladder)[1]).toBe('named-node');
  expect(grown.nodes['named-node']).toEqual(spare);
});

test('a router bound as a child nests under the one that named it', () => {
  const routed = gatewayRoutingThrough(codex, 'fast', 'failover');
  const ladder = routerIn(routingOf(routed));
  const nested: RouteNode = { kind: 'router', policy: { mode: 'round-robin' }, children: [] };
  const grown = routingOf(gatewayBindingChild(routed, 'fast', ladder, 'nested', nested));
  const [, second] = childrenOf(grown, ladder);

  expect(second === undefined ? undefined : grown.nodes[second]).toEqual(nested);
  expect(routingSchema.safeParse(grown).success).toBe(true);
});

test('a child bound under a node that routes nothing leaves the whole gateway as it stood', () => {
  const routed = gatewayRoutingThrough(codex, 'fast', 'failover');
  const ladder = routerIn(routingOf(routed));
  const child = childrenOf(routingOf(routed), ladder)[0] ?? '';

  expect(gatewayBindingChild(routed, 'fast', child, 'second', spare)).toEqual(routed);
});

test('rebinding one child stands the picked target in its place rather than beside it', () => {
  const three = ladderOfThree();
  const ladder = routerIn(routingOf(three));
  const rebound = routingOf(gatewayRebindingNode(three, 'fast', 'second', elsewhere));

  expect(childrenOf(rebound, ladder)).toEqual(childrenOf(routingOf(three), ladder));
  expect(rebound.nodes['second']).toEqual(elsewhere);
});

test('rebinding one child leaves every sibling of that child exactly as it stood', () => {
  const three = ladderOfThree();
  const rebound = routingOf(gatewayRebindingNode(three, 'fast', 'second', elsewhere));
  const stood = routingOf(three);

  expect(rebound.nodes['third']).toEqual(stood.nodes['third']);
  expect(routingSchema.safeParse(rebound).success).toBe(true);
});

test('rebinding a child that held a ladder takes that ladder with it, leaving nothing stranded', () => {
  const three = ladderOfThree();
  const ladder = routerIn(routingOf(three));
  const branched = gatewayBindingChild(three, 'fast', ladder, 'branch', {
    kind: 'router',
    policy: { mode: 'failover' },
    children: [],
  });
  const grown = gatewayBindingChild(branched, 'fast', 'branch', 'leaf', spare);
  const rebound = routingOf(gatewayRebindingNode(grown, 'fast', 'branch', elsewhere));

  expect(rebound.nodes['branch']).toEqual(elsewhere);
  expect(rebound.nodes['leaf']).toBeUndefined();
  expect(childrenOf(rebound, ladder)).toContain('branch');
  expect(routingSchema.safeParse(rebound).success).toBe(true);
});

test('rebinding a route node the table never held leaves the whole gateway as it stood', () => {
  const three = ladderOfThree();

  expect(gatewayRebindingNode(three, 'fast', 'never-minted', elsewhere)).toEqual(three);
});

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

  expect(gatewayBindingChild(routed, 'fast', 'never-minted', 'second', spare)).toEqual(routed);
  expect(gatewayReordering(routed, 'fast', 'never-minted', 0, 0)).toEqual(routed);
  expect(gatewaySwitching(routed, 'fast', 'never-minted', 'round-robin')).toEqual(routed);
});

test('naming a router writes the name a person gave it and leaves its ladder standing', () => {
  const three = ladderOfThree();
  const ladder = routerIn(routingOf(three));
  const named = routingOf(gatewayNamingRouter(three, 'fast', ladder, 'Ladder'));

  expect(named.nodes[ladder]).toMatchObject({ displayName: 'Ladder' });
  expect(childrenOf(named, ladder)).toEqual(childrenOf(routingOf(three), ladder));
});

test('clearing a router name stands it back under the mode it spreads requests by', () => {
  const three = ladderOfThree();
  const ladder = routerIn(routingOf(three));
  const named = gatewayNamingRouter(three, 'fast', ladder, 'Ladder');
  const bare = routingOf(gatewayNamingRouter(named, 'fast', ladder, undefined));

  expect(bare.nodes[ladder]).toEqual({
    kind: 'router',
    policy: { mode: 'failover' },
    children: childrenOf(routingOf(three), ladder),
  });
  expect(routingSchema.safeParse(bare).success).toBe(true);
});

test('naming a route node that routes nothing leaves the whole gateway as it stood', () => {
  const three = ladderOfThree();

  expect(gatewayNamingRouter(three, 'fast', 'second', 'Ladder')).toEqual(three);
});

test('switching a router to another mode leaves the children standing under it', () => {
  const routed = gatewayRoutingThrough(codex, 'fast', 'failover');
  const ladder = routerIn(routingOf(routed));
  const spread = routingOf(gatewaySwitching(routed, 'fast', ladder, 'round-robin'));

  expect(spread.nodes[ladder]).toMatchObject({ policy: { mode: 'round-robin' } });
  expect(childrenOf(spread, ladder)).toEqual(childrenOf(routingOf(routed), ladder));
});

test('switching the mode of a node that routes nothing leaves the whole gateway as it stood', () => {
  expect(gatewaySwitching(codex, 'fast', 't1', 'round-robin')).toEqual(codex);
});

test('an edit naming a model the gateway does not serve leaves the whole gateway as it stood', () => {
  expect(gatewayRoutingThrough(codex, 'unknown', 'failover')).toEqual(codex);
});
