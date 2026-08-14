import type { Routing } from '@recompose/contracts';

import { expect, test } from 'vitest';

import { firstDeclaredTarget, seatedRouteNodes } from './route-graph';

const directlyBound: Routing = {
  entry: 'seat',
  nodes: { seat: { kind: 'target', accountId: 'a1', providerModel: 'claude-sonnet-5' } },
};

const overTwoTargets: Routing = {
  entry: 'ladder',
  nodes: {
    ladder: { kind: 'router', policy: { mode: 'failover' }, children: ['first', 'second'] },
    first: { kind: 'target', accountId: 'a1', providerModel: 'claude-sonnet-5' },
    second: { kind: 'target', accountId: 'a2', providerModel: 'claude-opus-5' },
  },
};

const overANestedRouter: Routing = {
  entry: 'ladder',
  nodes: {
    ladder: { kind: 'router', policy: { mode: 'failover' }, children: ['first', 'spread'] },
    first: { kind: 'target', accountId: 'a1', providerModel: 'claude-sonnet-5' },
    spread: { kind: 'router', policy: { mode: 'round-robin' }, children: ['third'] },
    third: { kind: 'target', accountId: 'a3', providerModel: 'claude-haiku-5' },
  },
};

test('a model bound straight to a target seats that target at the entry, with no router above it', () => {
  expect(seatedRouteNodes(directlyBound)).toEqual([
    {
      routeNodeId: 'seat',
      node: directlyBound.nodes['seat'],
      depth: 0,
      parent: undefined,
    },
  ]);
});

test('a router seats at the entry and its children one level deeper, in declared order', () => {
  expect(
    seatedRouteNodes(overTwoTargets).map((seat) => [seat.routeNodeId, seat.depth, seat.parent]),
  ).toEqual([
    ['ladder', 0, undefined],
    ['first', 1, 'ladder'],
    ['second', 1, 'ladder'],
  ]);
});

test('a nested router carries its own children a level deeper again', () => {
  expect(
    seatedRouteNodes(overANestedRouter).map((seat) => [seat.routeNodeId, seat.depth, seat.parent]),
  ).toEqual([
    ['ladder', 0, undefined],
    ['first', 1, 'ladder'],
    ['spread', 1, 'ladder'],
    ['third', 2, 'spread'],
  ]);
});

test('a routing whose entry names no node seats nothing at all', () => {
  expect(seatedRouteNodes({ entry: 'gone', nodes: {} })).toEqual([]);
});

test('a router naming a child the table never held seats the router alone', () => {
  const dangling: Routing = {
    entry: 'ladder',
    nodes: { ladder: { kind: 'router', policy: { mode: 'failover' }, children: ['gone'] } },
  };

  expect(seatedRouteNodes(dangling).map((seat) => seat.routeNodeId)).toEqual(['ladder']);
});

test('a model bound straight to a target leads with that target', () => {
  expect(firstDeclaredTarget(directlyBound)).toEqual({
    kind: 'target',
    accountId: 'a1',
    providerModel: 'claude-sonnet-5',
  });
});

test('a routed model leads with the first target its ladder declares', () => {
  expect(firstDeclaredTarget(overTwoTargets)).toMatchObject({ accountId: 'a1' });
});

test('a ladder leading with a nested router still leads with the first target under it', () => {
  const spreadFirst: Routing = {
    ...overANestedRouter,
    nodes: {
      ...overANestedRouter.nodes,
      ladder: { kind: 'router', policy: { mode: 'failover' }, children: ['spread', 'first'] },
    },
  };

  expect(firstDeclaredTarget(spreadFirst)).toMatchObject({ accountId: 'a3' });
});

test('a router holding no child leads with no target at all', () => {
  const empty: Routing = {
    entry: 'ladder',
    nodes: { ladder: { kind: 'router', policy: { mode: 'round-robin' }, children: [] } },
  };

  expect(firstDeclaredTarget(empty)).toBeUndefined();
});
