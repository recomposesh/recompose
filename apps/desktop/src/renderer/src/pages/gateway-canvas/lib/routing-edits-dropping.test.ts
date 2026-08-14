import type { GatewayConfig } from '@recompose/contracts';

import { routingSchema } from '@recompose/contracts';
import { expect, test } from 'vitest';

import { gatewayBindingChild, gatewayDroppingNode, gatewayRoutingThrough } from './routing-edits';
import { childrenOf, codex, ladderOfThree, routingOf, spare } from './routing-edits.testkit';

function nestedLadder(): GatewayConfig {
  const routed = gatewayRoutingThrough(ladderOfThree(), 'fast', 'failover');

  return gatewayBindingChild(routed, 'fast', routingOf(routed).entry, 'sibling', spare);
}

test('dropping a child takes it out of the ladder and out of the table with it', () => {
  const dropped = routingOf(gatewayDroppingNode(ladderOfThree(), 'fast', 'third'));

  expect(childrenOf(dropped, dropped.entry)).not.toContain('third');
  expect(dropped.nodes['third']).toBeUndefined();
  expect(routingSchema.safeParse(dropped).success).toBe(true);
});

test('dropping a router takes everything standing under it away too', () => {
  const nested = nestedLadder();
  const inner = childrenOf(routingOf(nested), routingOf(nested).entry)[0] ?? '';
  const dropped = routingOf(gatewayDroppingNode(nested, 'fast', inner));

  expect(Object.keys(dropped.nodes).toSorted()).toEqual([dropped.entry, 'sibling'].toSorted());
  expect(routingSchema.safeParse(dropped).success).toBe(true);
});

test('dropping a child leaves every other child standing in the order it stood', () => {
  const three = ladderOfThree();
  const ladder = routingOf(three).entry;
  const before = childrenOf(routingOf(three), ladder);
  const dropped = routingOf(gatewayDroppingNode(three, 'fast', 'second'));

  expect(childrenOf(dropped, ladder)).toEqual(before.filter((child) => child !== 'second'));
});

test('dropping the entry leaves the whole gateway as it stood, since a routing binds something', () => {
  const three = ladderOfThree();

  expect(gatewayDroppingNode(three, 'fast', routingOf(three).entry)).toEqual(three);
});

test('dropping a node the table never held leaves the whole gateway as it stood', () => {
  const three = ladderOfThree();

  expect(gatewayDroppingNode(three, 'fast', 'never-minted')).toEqual(three);
});

test('dropping from a model the gateway does not serve leaves the whole gateway as it stood', () => {
  expect(gatewayDroppingNode(codex, 'unknown', 'seat')).toEqual(codex);
});

test('a branch naming a child the table never held still drops the children it does hold', () => {
  const dangling: GatewayConfig = {
    ...codex,
    virtualModels: [
      {
        id: 'fast',
        displayName: 'Fast',
        routing: {
          entry: 'r1',
          nodes: {
            r1: { kind: 'router', policy: { mode: 'failover' }, children: ['r2'] },
            r2: { kind: 'router', policy: { mode: 'failover' }, children: ['gone', 'seat'] },
            seat: { kind: 'target', accountId: 'a1', providerModel: 'claude-sonnet-5' },
          },
        },
      },
    ],
  };

  expect(routingOf(gatewayDroppingNode(dangling, 'fast', 'r2')).nodes).toEqual({
    r1: { kind: 'router', policy: { mode: 'failover' }, children: [] },
  });
});

test('a branch that names itself in a circle still finishes, so no table can hang the canvas', () => {
  const circular: GatewayConfig = {
    ...codex,
    virtualModels: [
      {
        id: 'fast',
        displayName: 'Fast',
        routing: {
          entry: 'r1',
          nodes: {
            r1: { kind: 'router', policy: { mode: 'failover' }, children: ['r2'] },
            r2: { kind: 'router', policy: { mode: 'failover' }, children: ['r2'] },
          },
        },
      },
    ],
  };

  expect(routingOf(gatewayDroppingNode(circular, 'fast', 'r2')).nodes).toEqual({
    r1: { kind: 'router', policy: { mode: 'failover' }, children: [] },
  });
});
