import type { Routing } from '@recompose/contracts';

import { expect, test } from 'vitest';

import { firstDeclaredTarget, walkedRouteNodes } from './route-graph';

const directlyBound: Routing = {
  entry: 't1',
  nodes: { t1: { kind: 'target', accountId: 'a1', providerModel: 'claude-sonnet-5' } },
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

const judged: Routing = {
  entry: 'ladder',
  nodes: {
    ladder: {
      kind: 'router',
      policy: {
        mode: 'conditional',
        judge: 'advisor',
        branches: [{ label: 'code', rule: 'The request reviews or writes code.', child: 'first' }],
        elseChild: 'second',
        judgeBoundMs: 3000,
        rejudgeEveryRequest: false,
      },
      children: ['first', 'second'],
    },
    first: { kind: 'target', accountId: 'a1', providerModel: 'claude-sonnet-5' },
    second: { kind: 'target', accountId: 'a2', providerModel: 'claude-opus-5' },
    advisor: { kind: 'target', accountId: 'a3', providerModel: 'claude-haiku-5' },
  },
};

function branchAt(routing: Routing, routeNodeId: string) {
  return walkedRouteNodes(routing).find((walked) => walked.routeNodeId === routeNodeId)?.branch;
}

test('a model bound straight to a target seats that target at the entry, with no router above it', () => {
  expect(walkedRouteNodes(directlyBound)).toEqual([
    {
      routeNodeId: 't1',
      node: directlyBound.nodes['t1'],
      depth: 0,
      parent: undefined,
    },
  ]);
});

test('a router seats at the entry and its children one level deeper, in declared order', () => {
  expect(
    walkedRouteNodes(overTwoTargets).map((walked) => [
      walked.routeNodeId,
      walked.depth,
      walked.parent,
    ]),
  ).toEqual([
    ['ladder', 0, undefined],
    ['first', 1, 'ladder'],
    ['second', 1, 'ladder'],
  ]);
});

test('a nested router carries its own children a level deeper again', () => {
  expect(
    walkedRouteNodes(overANestedRouter).map((walked) => [
      walked.routeNodeId,
      walked.depth,
      walked.parent,
    ]),
  ).toEqual([
    ['ladder', 0, undefined],
    ['first', 1, 'ladder'],
    ['spread', 1, 'ladder'],
    ['third', 2, 'spread'],
  ]);
});

test('a routing whose entry names no node seats nothing at all', () => {
  expect(walkedRouteNodes({ entry: 'gone', nodes: {} })).toEqual([]);
});

test('a router naming a child the table never held seats the router alone', () => {
  const dangling: Routing = {
    entry: 'ladder',
    nodes: { ladder: { kind: 'router', policy: { mode: 'failover' }, children: ['gone'] } },
  };

  expect(walkedRouteNodes(dangling).map((walked) => walked.routeNodeId)).toEqual(['ladder']);
});

test('the judge stands on the canvas right beside the router it advises', () => {
  expect(walkedRouteNodes(judged).map((walked) => [walked.routeNodeId, walked.advises])).toEqual([
    ['ladder', undefined],
    ['advisor', 'ladder'],
    ['first', undefined],
    ['second', undefined],
  ]);
});

test('the judge seats beside its router rather than a column further out', () => {
  const seated = walkedRouteNodes(judged);
  const advisor = seated.find((walked) => walked.routeNodeId === 'advisor');
  const router = seated.find((walked) => walked.routeNodeId === 'ladder');

  expect(advisor?.depth).toBe(router?.depth);
  expect(advisor?.parent).toBe('ladder');
});

test('a judge naming no node in the table stands nothing at all', () => {
  const { advisor, ...withoutTheJudge } = judged.nodes;
  const strayJudge: Routing = { entry: 'ladder', nodes: withoutTheJudge };

  expect(advisor).toBeDefined();
  expect(walkedRouteNodes(strayJudge).map((walked) => walked.routeNodeId)).toEqual([
    'ladder',
    'first',
    'second',
  ]);
});

test('the target a reading of one model uses is never the judge, so no count bills it', () => {
  expect(firstDeclaredTarget(judged)).toMatchObject({ accountId: 'a1' });
});

test('a labeled branch hands its child the label and the rule the judge reads it by', () => {
  expect(branchAt(judged, 'first')).toEqual({
    kind: 'rule',
    label: 'code',
    rule: 'The request reviews or writes code.',
  });
});

test('the else child reads as the fallback rather than as a rule anyone wrote', () => {
  expect(branchAt(judged, 'second')).toEqual({ kind: 'else' });
});

test('a child of a router that reads no request at all carries no branch', () => {
  expect(branchAt(overTwoTargets, 'first')).toBeUndefined();
  expect(branchAt(judged, 'ladder')).toBeUndefined();
});

test('a branch naming a child before else does the naming, so no cable loses its rule', () => {
  const bothWays: Routing = {
    entry: 'ladder',
    nodes: {
      ...judged.nodes,
      ladder: {
        kind: 'router',
        policy: {
          mode: 'conditional',
          judge: 'advisor',
          branches: [{ label: 'code', rule: 'The request writes code.', child: 'second' }],
          elseChild: 'second',
          judgeBoundMs: 3000,
          rejudgeEveryRequest: false,
        },
        children: ['first', 'second'],
      },
    },
  };

  expect(branchAt(bothWays, 'second')).toEqual({
    kind: 'rule',
    label: 'code',
    rule: 'The request writes code.',
  });
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
