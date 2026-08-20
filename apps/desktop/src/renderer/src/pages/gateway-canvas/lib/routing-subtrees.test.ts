import type { RouteNode, Routing } from '@recompose/contracts';

import { routingSchema } from '@recompose/contracts';
import { expect, test } from 'vitest';

import { beneath, standingUnder, tableWithout } from './routing-subtrees';

function aTargetOn(accountId: string, providerModel: string): RouteNode {
  return { kind: 'target', accountId, providerModel };
}

function aConditionalRouterOver(judge: string, branchChild: string, elseChild: string): RouteNode {
  return {
    kind: 'router',
    policy: {
      mode: 'conditional',
      judge,
      branches: [{ label: 'code', rule: 'questions about source code', child: branchChild }],
      elseChild,
      judgeBoundMs: 3000,
      rejudgeEveryRequest: false,
    },
    children: [branchChild, elseChild],
  };
}

/** A ladder over two conditional routers that ask the very same judge, which the shape allows. */
function twoRoutersSharingOneJudge(): Routing {
  return {
    entry: 'top',
    nodes: {
      top: { kind: 'router', policy: { mode: 'failover' }, children: ['r1', 'r2'] },
      r1: aConditionalRouterOver('j1', 'c1', 'e1'),
      r2: aConditionalRouterOver('j1', 'c2', 'e2'),
      c1: aTargetOn('a1', 'claude-sonnet-5'),
      e1: aTargetOn('a2', 'claude-opus-5'),
      c2: aTargetOn('a3', 'claude-haiku-5'),
      e2: aTargetOn('a4', 'claude-sonnet-5'),
      j1: aTargetOn('a5', 'claude-haiku-5'),
    },
  };
}

test('a shared judge stays behind when only one of the routers asking it leaves', () => {
  const routing = twoRoutersSharingOneJudge();

  expect(standingUnder(routing, 'r1')).toEqual(new Set(['r1', 'c1', 'e1']));
});

test('the table one of two sharing routers leaves still parses, judge and all', () => {
  const routing = twoRoutersSharingOneJudge();

  const kept = tableWithout(routing, standingUnder(routing, 'r1'));

  expect(routingSchema.safeParse(kept).success).toBe(true);
  expect(kept.nodes['j1']).toEqual(routing.nodes['j1']);
});

test('the judge leaves once the second router asking it goes too', () => {
  const routing = twoRoutersSharingOneJudge();

  const alone = tableWithout(routing, standingUnder(routing, 'r1'));

  expect(standingUnder(alone, 'r2')).toEqual(new Set(['r2', 'c2', 'e2', 'j1']));
});

test('the ancestor over both routers carries the judge out with them', () => {
  const routing = twoRoutersSharingOneJudge();

  expect(standingUnder(routing, 'top')).toEqual(new Set(Object.keys(routing.nodes)));
});

test('a shared judge stays where a router rebound to a target gave up its seat', () => {
  const routing = twoRoutersSharingOneJudge();

  expect(beneath(routing, 'r2')).toEqual(new Set(['c2', 'e2']));
});

test('a node keeping its seat gives up everything under it and nothing else', () => {
  const routing = twoRoutersSharingOneJudge();

  expect(beneath(routing, 'top')).toEqual(new Set(['r1', 'r2', 'c1', 'e1', 'c2', 'e2', 'j1']));
});
