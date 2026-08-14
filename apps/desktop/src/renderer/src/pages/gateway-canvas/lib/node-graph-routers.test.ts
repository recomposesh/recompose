import type { Account, GatewayConfig, VirtualModel } from '@recompose/contracts';

import { GATEWAY_CONFIG_VERSION } from '@recompose/contracts';
import { expect, test } from 'vitest';

import type { CanvasGraph, CanvasOverlay } from './node-graph';

import { canvasGraph } from './node-graph';

const work: Account = {
  id: 'a1',
  provider: 'anthropic',
  kind: 'subscription',
  provenance: 'sign-in',
  label: 'Work',
};

const spare: Account = {
  id: 'a2',
  provider: 'openai',
  kind: 'subscription',
  provenance: 'sign-in',
  label: 'Spare',
};

const overTwoTargets: VirtualModel = {
  id: 'fast',
  displayName: 'Fast',
  routing: {
    entry: 'ladder',
    nodes: {
      ladder: { kind: 'router', policy: { mode: 'failover' }, children: ['first', 'second'] },
      first: { kind: 'target', accountId: 'a1', providerModel: 'claude-sonnet-5' },
      second: { kind: 'target', accountId: 'a2', providerModel: 'claude-opus-5' },
    },
  },
};

const codex: GatewayConfig = {
  schemaVersion: GATEWAY_CONFIG_VERSION,
  slug: 'codex',
  displayName: 'Codex',
  port: 8397,
  virtualModels: [overTwoTargets],
  layout: { nodes: {} },
};

const nothingOverlaid: CanvasOverlay = { draft: undefined, pending: undefined };

function graphOf(model: VirtualModel, accounts: readonly Account[] = [work, spare]): CanvasGraph {
  return canvasGraph({ ...codex, virtualModels: [model] }, accounts, nothingOverlaid);
}

function routedWith(nodes: VirtualModel['routing']['nodes']): VirtualModel {
  return { ...overTwoTargets, routing: { entry: 'ladder', nodes } };
}

test('a routed model stands its router between itself and the targets under it', () => {
  expect(graphOf(overTwoTargets).nodes.map((node) => node.kind)).toEqual([
    'gateway',
    'virtual-model',
    'router',
    'target',
    'target',
  ]);
});

test('the router card names the mode it spreads by and how many children it holds', () => {
  expect(graphOf(overTwoTargets).nodes[2]).toEqual({
    id: 'route:fast',
    kind: 'router',
    modelId: 'fast',
    routeNodeId: 'ladder',
    depth: 0,
    mode: 'failover',
    displayName: undefined,
    childCount: 2,
  });
});

test('a router a person named carries that name, so no surface has to derive one', () => {
  const named = routedWith({
    ...overTwoTargets.routing.nodes,
    ladder: {
      kind: 'router',
      displayName: 'Ladder',
      policy: { mode: 'round-robin' },
      children: ['first'],
    },
  });

  expect(graphOf(named).nodes[2]).toMatchObject({
    displayName: 'Ladder',
    mode: 'round-robin',
    childCount: 1,
  });
});

test('every child of a router stands under its own route node id, so two never share a card', () => {
  expect(graphOf(overTwoTargets).nodes.map((node) => node.id)).toEqual([
    'gateway',
    'model:fast',
    'route:fast',
    'target:fast:first',
    'target:fast:second',
  ]);
});

test('a child carries the account it reaches and the route node the ladder holds it under', () => {
  expect(graphOf(overTwoTargets).nodes[3]).toEqual({
    id: 'target:fast:first',
    kind: 'target',
    account: work,
    modelId: 'fast',
    routeNodeId: 'first',
    depth: 1,
    detail: 'Work',
  });
});

test('a child whose account left the registry stands as a ghost of its own', () => {
  expect(graphOf(overTwoTargets, [work]).nodes[4]).toEqual({
    id: 'ghost:fast:second',
    kind: 'ghost-target',
    accountId: 'a2',
    modelId: 'fast',
    routeNodeId: 'second',
    depth: 1,
  });
});

test('a nested router stands as its own card, one level under the router that names it', () => {
  const nested = routedWith({
    ladder: { kind: 'router', policy: { mode: 'failover' }, children: ['spread'] },
    spread: { kind: 'router', policy: { mode: 'round-robin' }, children: ['first'] },
    first: { kind: 'target', accountId: 'a1', providerModel: 'claude-sonnet-5' },
  });

  expect(graphOf(nested).nodes.at(2)).toMatchObject({ id: 'route:fast', depth: 0 });
  expect(graphOf(nested).nodes.at(3)).toMatchObject({ id: 'route:fast:spread', depth: 1 });
  expect(graphOf(nested).nodes.at(4)).toMatchObject({ id: 'target:fast:first', depth: 2 });
});

test('a router holding no child stands alone, with nothing wired under it', () => {
  const childless = routedWith({
    ladder: { kind: 'router', policy: { mode: 'failover' }, children: [] },
  });

  expect(graphOf(childless).nodes.map((node) => node.kind)).toEqual([
    'gateway',
    'virtual-model',
    'router',
  ]);
  expect(graphOf(childless).nodes[2]).toMatchObject({ childCount: 0 });
});

test('the model binds its router by one cable, and the router binds each child by its own', () => {
  expect(graphOf(overTwoTargets).edges).toEqual([
    {
      id: 'wire:model:fast',
      source: 'gateway',
      target: 'model:fast',
      standing: 'structural',
      failure: undefined,
    },
    {
      id: 'cable:fast',
      source: 'model:fast',
      target: 'route:fast',
      standing: 'resting',
      failure: undefined,
    },
    {
      id: 'cable:fast:first',
      source: 'route:fast',
      target: 'target:fast:first',
      standing: 'resting',
      failure: undefined,
    },
    {
      id: 'cable:fast:second',
      source: 'route:fast',
      target: 'target:fast:second',
      standing: 'resting',
      failure: undefined,
    },
  ]);
});

test('the cable onto a child whose account left the registry reads broken', () => {
  const onto = graphOf(overTwoTargets, [work]).edges.find(
    (cable) => cable.id === 'cable:fast:second',
  );

  expect(onto).toMatchObject({ target: 'ghost:fast:second', standing: 'broken' });
});

test('a routed model still answers the gateway through exactly one structural wire', () => {
  const wires = graphOf(overTwoTargets).edges.filter((cable) => cable.standing === 'structural');

  expect(wires.map((cable) => cable.target)).toEqual(['model:fast']);
});

test('a model bound straight to a target keeps the very cable and card it stood with', () => {
  const direct: VirtualModel = {
    id: 'fast',
    displayName: 'Fast',
    routing: {
      entry: 'seat',
      nodes: { seat: { kind: 'target', accountId: 'a1', providerModel: 'claude-sonnet-5' } },
    },
  };

  expect(graphOf(direct).nodes.map((node) => node.id)).toEqual([
    'gateway',
    'model:fast',
    'target:fast',
  ]);
  expect(graphOf(direct).edges.map((cable) => cable.id)).toEqual(['wire:model:fast', 'cable:fast']);
});

test('the model card names the real model its ladder tries first', () => {
  expect(graphOf(overTwoTargets).nodes[1]).toMatchObject({
    providerModel: 'claude-sonnet-5',
  });
});

test('a model routed through a router holding no target names no real model at all', () => {
  const childless = routedWith({
    ladder: { kind: 'router', policy: { mode: 'failover' }, children: [] },
  });

  expect(graphOf(childless).nodes[1]).toMatchObject({ providerModel: '' });
});
