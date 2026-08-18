import type { Account, GatewayConfig, GatewayTraffic, VirtualModel } from '@recompose/contracts';

import { GATEWAY_CONFIG_VERSION } from '@recompose/contracts';

import type { CableStanding, CanvasEdge, CanvasGraph, CanvasOverlay } from './node-graph';

import { canvasGraph } from './node-graph';

const work: Account = {
  id: 'a1',
  provider: 'anthropic',
  kind: 'subscription',
  provenance: 'sign-in',
  label: 'Work',
};

const fast: VirtualModel = {
  id: 'fast',
  displayName: 'Fast',
  routing: {
    entry: 'node-fast',
    nodes: { 'node-fast': { kind: 'target', accountId: 'a1', providerModel: 'claude-sonnet-5' } },
  },
};

export const codex: GatewayConfig = {
  schemaVersion: GATEWAY_CONFIG_VERSION,
  slug: 'codex',
  displayName: 'Codex',
  port: 8397,
  virtualModels: [fast],
  layout: { nodes: {} },
};

const nothingOverlaid: CanvasOverlay = { draft: undefined, pending: undefined };

export const JUST_AFTER = 1_754_600_000_500;

export const A_MINUTE_LATER = 1_754_600_061_000;

export function graphAt(
  traffic: GatewayTraffic,
  now: number,
  gateway: GatewayConfig = codex,
): CanvasGraph {
  return canvasGraph(gateway, [work], nothingOverlaid, traffic, [], now);
}

export function standingsOf(graph: CanvasGraph): readonly CableStanding[] {
  return graph.edges.map((cable) => cable.standing);
}

export function cableIn(graph: CanvasGraph, id: string): CanvasEdge | undefined {
  return graph.edges.find((cable) => cable.id === id);
}
