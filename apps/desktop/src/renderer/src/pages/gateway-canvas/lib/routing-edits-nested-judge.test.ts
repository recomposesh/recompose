import type { GatewayConfig, RouteTarget } from '@recompose/contracts';

import { routingSchema } from '@recompose/contracts';
import { expect, test } from 'vitest';

import {
  gatewayBindingChild,
  gatewayDroppingNode,
  gatewayRebindingNode,
  gatewayRoutingThrough,
} from './routing-edits';
import { childrenOf, judged, routingOf, spare } from './routing-edits.testkit';

const replacement: RouteTarget = {
  kind: 'target',
  accountId: 'a7',
  providerModel: 'claude-sonnet-5',
};

function ladderOverAJudge(): GatewayConfig {
  const routed = gatewayRoutingThrough(judged(), 'fast', 'failover');

  return gatewayBindingChild(routed, 'fast', routingOf(routed).entry, 'plain', spare);
}

function ladderTwoAbove(): GatewayConfig {
  const routed = gatewayRoutingThrough(ladderOverAJudge(), 'fast', 'failover');

  return gatewayBindingChild(routed, 'fast', routingOf(routed).entry, 'aside', spare);
}

test('dropping a conditional router carries its judge out of the table with it', () => {
  const dropped = routingOf(gatewayDroppingNode(ladderOverAJudge(), 'fast', 'r1'));

  expect(dropped.nodes['j1']).toBeUndefined();
  expect(routingSchema.safeParse(dropped).success).toBe(true);
});

test('dropping a conditional router leaves the sibling that never judged standing', () => {
  const dropped = routingOf(gatewayDroppingNode(ladderOverAJudge(), 'fast', 'r1'));

  expect(Object.keys(dropped.nodes).toSorted()).toEqual([dropped.entry, 'plain'].toSorted());
});

test('rebinding a conditional router carries its judge out of the table with it', () => {
  const rebound = routingOf(gatewayRebindingNode(ladderOverAJudge(), 'fast', 'r1', replacement));

  expect(rebound.nodes['j1']).toBeUndefined();
  expect(rebound.nodes['r1']).toEqual(replacement);
  expect(routingSchema.safeParse(rebound).success).toBe(true);
});

test('dropping a router above a conditional one carries the judge nested under it', () => {
  const stacked = ladderTwoAbove();
  const mid = childrenOf(routingOf(stacked), routingOf(stacked).entry)[0] ?? '';
  const dropped = routingOf(gatewayDroppingNode(stacked, 'fast', mid));

  expect(dropped.nodes['j1']).toBeUndefined();
  expect(Object.keys(dropped.nodes).toSorted()).toEqual([dropped.entry, 'aside'].toSorted());
  expect(routingSchema.safeParse(dropped).success).toBe(true);
});

test('a judge standing under the router being dropped still leaves with it', () => {
  const held = judged();
  const nested: GatewayConfig = {
    ...held,
    virtualModels: [
      {
        id: 'fast',
        displayName: 'Fast',
        routing: {
          entry: 'top',
          nodes: {
            ...routingOf(held).nodes,
            top: { kind: 'router', policy: { mode: 'failover' }, children: ['r1', 'plain'] },
            plain: spare,
          },
        },
      },
    ],
  };
  const dropped = routingOf(gatewayDroppingNode(nested, 'fast', 'r1'));

  expect(Object.keys(dropped.nodes).toSorted()).toEqual(['plain', 'top']);
  expect(routingSchema.safeParse(dropped).success).toBe(true);
});
