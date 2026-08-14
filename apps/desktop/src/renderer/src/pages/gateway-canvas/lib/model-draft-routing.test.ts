import type { GatewayConfig, RouteTarget, VirtualModel } from '@recompose/contracts';

import { GATEWAY_CONFIG_VERSION, routingSchema } from '@recompose/contracts';
import { expect, test } from 'vitest';

import { gatewayDefiningRouted, gatewayRebinding } from './model-draft';
import { gatewayRoutingThrough } from './routing-edits';

const fast: VirtualModel = {
  id: 'fast',
  displayName: 'fast',
  routing: {
    entry: 'seat-fast',
    nodes: { 'seat-fast': { kind: 'target', accountId: 'a1', providerModel: 'claude-sonnet-5' } },
  },
};

const codex: GatewayConfig = {
  schemaVersion: GATEWAY_CONFIG_VERSION,
  slug: 'codex',
  displayName: 'Codex',
  port: 8397,
  virtualModels: [],
  layout: { nodes: {} },
};

const onWork: RouteTarget = {
  kind: 'target',
  accountId: 'a2',
  providerModel: 'claude-haiku-4-5',
};

test('rebinding a routed virtual model leaves it reaching that one target and nothing else', () => {
  const routed = gatewayRoutingThrough({ ...codex, virtualModels: [fast] }, 'fast', 'failover');
  const rebound = gatewayRebinding(routed, 'fast', onWork);
  const { routing } = rebound.virtualModels[0] ?? fast;

  expect(Object.values(routing.nodes)).toEqual([onWork]);
  expect(routingSchema.safeParse(routing).success).toBe(true);
});

test('a draft settled onto a router routes through one holding no child yet', () => {
  const defined = gatewayDefiningRouted(codex, { id: 'fast', displayName: 'Fast' }, 'failover');
  const { routing } = defined.virtualModels[0] ?? fast;

  expect(routing.nodes[routing.entry]).toEqual({
    kind: 'router',
    policy: { mode: 'failover' },
    children: [],
  });
});

test('a definition settled onto a router joins the ones the gateway already holds', () => {
  const defined = gatewayDefiningRouted(
    { ...codex, virtualModels: [fast] },
    { id: 'slow', displayName: 'Slow' },
    'round-robin',
  );

  expect(defined.virtualModels.map((model) => model.id)).toEqual(['fast', 'slow']);
});
