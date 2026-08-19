import type { Account, Routing } from '@recompose/contracts';

import { expect, test } from 'vitest';

import type { PlacedRouteNode, Registry } from './canvas-cards';

import { routeCard } from './canvas-cards';
import { addressName } from './route-addresses';
import { walkedRouteNodes } from './route-graph';

const work: Account = {
  id: 'a1',
  provider: 'anthropic',
  kind: 'api-key',
  label: 'Work',
  credentialRef: 'c1',
};

const registry: Registry = { accounts: [work], subscriptions: [] };

const judged: Routing = {
  entry: 'ladder',
  nodes: {
    ladder: {
      kind: 'router',
      policy: {
        mode: 'conditional',
        judge: 'advisor',
        branches: [{ label: 'code', rule: 'The request writes code.', child: 'first' }],
        elseChild: 'second',
        judgeBoundMs: 3000,
        rejudgeEveryRequest: false,
      },
      children: ['first', 'second'],
    },
    first: { kind: 'target', accountId: 'a1', providerModel: 'claude-sonnet-5' },
    second: { kind: 'target', accountId: 'gone', providerModel: 'claude-opus-5' },
    advisor: { kind: 'target', accountId: 'a1', providerModel: 'claude-haiku-5' },
  },
};

function placed(routing: Routing, routeNodeId: string): PlacedRouteNode {
  const walked = walkedRouteNodes(routing).find((held) => held.routeNodeId === routeNodeId);

  if (walked === undefined) {
    throw new Error(`the walk never reached "${routeNodeId}"`);
  }

  const { entry } = routing;

  return {
    modelId: 'fast',
    name: addressName('fast', routeNodeId, entry),
    parentName: walked.parent === undefined ? undefined : addressName('fast', walked.parent, entry),
    walked,
  };
}

function cardFor(routeNodeId: string) {
  return routeCard(placed(judged, routeNodeId), registry);
}

test('a target card carries the branch whose rule sends requests to it', () => {
  expect(cardFor('first')).toMatchObject({
    kind: 'target',
    branch: { kind: 'rule', label: 'code', rule: 'The request writes code.' },
  });
});

test('a card standing where an account left still carries the branch that reaches it', () => {
  expect(cardFor('second')).toMatchObject({ kind: 'ghost-target', branch: { kind: 'else' } });
});

test('a router nobody branched to carries no branch of its own', () => {
  expect(cardFor('ladder')).toMatchObject({ kind: 'router', branch: undefined });
});

test('the judge stands as its own card, naming the router it advises and what it judges with', () => {
  expect(cardFor('advisor')).toEqual({
    id: 'judge:fast:advisor',
    kind: 'judge',
    modelId: 'fast',
    routeNodeId: 'advisor',
    depth: 0,
    advises: 'route:fast',
    accountId: 'a1',
    providerModel: 'claude-haiku-5',
  });
});
