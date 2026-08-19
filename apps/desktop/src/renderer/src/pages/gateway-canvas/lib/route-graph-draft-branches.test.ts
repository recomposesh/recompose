import type { Routing } from '@recompose/contracts';

import { describe, expect, test } from 'vitest';

import type { BranchSeat } from './route-graph';

import { walkedRouteNodes } from './route-graph';

function target(accountId: string) {
  return { kind: 'target', accountId, providerModel: 'claude-sonnet-5' } as const;
}

function judgedTable(branchedChildren: readonly string[]): Routing {
  return {
    entry: 'r1',
    nodes: {
      r1: {
        kind: 'router',
        policy: {
          mode: 'conditional',
          judge: 'advisor',
          branches: branchedChildren.map((child) => ({
            label: `label-${child}`,
            rule: `It looks like ${child}.`,
            child,
          })),
          elseChild: 'c3',
          judgeBoundMs: 3000,
          rejudgeEveryRequest: false,
        },
        children: ['c1', 'c2', 'c3'],
      },
      c1: target('k1'),
      c2: target('k1'),
      c3: target('k1'),
      advisor: target('k1'),
    },
  };
}

function seatOf(routing: Routing, routeNodeId: string): BranchSeat | undefined {
  return walkedRouteNodes(routing).find((held) => held.routeNodeId === routeNodeId)?.branch;
}

function spreadingTable(): Routing {
  return {
    entry: 'r1',
    nodes: {
      r1: { kind: 'router', policy: { mode: 'failover' }, children: ['c1'] },
      c1: target('k1'),
    },
  };
}

describe('a child of a judged router that no rule speaks for yet', () => {
  test('reads as a branch still waiting for its name and its rule', () => {
    expect(seatOf(judgedTable(['c1']), 'c2')).toEqual({ kind: 'draft' });
  });

  test('stands beside children that do carry a rule, each reading as what it is', () => {
    const routing = judgedTable(['c1']);

    expect([seatOf(routing, 'c1')?.kind, seatOf(routing, 'c2')?.kind]).toEqual(['rule', 'draft']);
  });

  test('the else child keeps reading as the fallback rather than as one to name', () => {
    expect(seatOf(judgedTable(['c1']), 'c3')).toEqual({ kind: 'else' });
  });

  test('every child of a judged router reads as something, so none attaches unspoken for', () => {
    const routing = judgedTable([]);
    const seats = ['c1', 'c2', 'c3'].map((child) => seatOf(routing, child));

    expect(seats.every((seat) => seat !== undefined)).toBe(true);
  });
});

describe('a child of a router that reads no request at all', () => {
  test('carries no branch, because ordering children is no decision about the request', () => {
    expect(seatOf(spreadingTable(), 'c1')).toBeUndefined();
  });
});
