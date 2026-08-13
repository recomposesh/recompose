import type { Account, GatewayConfig, VirtualModel } from '@recompose/contracts';

import { GATEWAY_CONFIG_VERSION } from '@recompose/contracts';
import { expect, test } from 'vitest';

import type {
  CableStanding,
  CanvasEdge,
  CanvasGraph,
  CanvasOverlay,
  DraftStanding,
  PendingStanding,
} from './node-graph';

import { gatewayRebinding } from './model-draft';
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

const fast: VirtualModel = {
  id: 'fast',
  displayName: 'Fast',
  target: { accountId: 'a1', providerModel: 'claude-sonnet-5' },
};

const slow: VirtualModel = {
  id: 'slow',
  displayName: 'Slow',
  target: { accountId: 'a2', providerModel: 'claude-opus-5' },
};

const codex: GatewayConfig = {
  schemaVersion: GATEWAY_CONFIG_VERSION,
  slug: 'codex',
  displayName: 'Codex',
  port: 8397,
  virtualModels: [fast],
  layout: { nodes: {} },
};

const nothingOverlaid: CanvasOverlay = { draft: undefined, pending: undefined };

const seat = { x: 320, y: 140 };

const fastAtRest: CanvasEdge = {
  id: 'cable:fast',
  source: 'model:fast',
  target: 'target:fast',
  standing: 'resting',
  failure: undefined,
};

const fastWired: CanvasEdge = {
  id: 'wire:model:fast',
  source: 'gateway',
  target: 'model:fast',
  standing: 'structural',
  failure: undefined,
};

function standingsOf(graph: CanvasGraph): readonly CableStanding[] {
  return graph.edges.map((cable) => cable.standing);
}

test('a served gateway stands wired to its virtual model, which answers through one resting cable', () => {
  const graph = canvasGraph(codex, [work], nothingOverlaid);

  expect(graph.nodes.map((node) => node.kind)).toEqual(['gateway', 'virtual-model', 'target']);
  expect(graph.edges).toEqual([fastWired, fastAtRest]);
});

test('the gateway node carries the name and the port a person composed against', () => {
  const [gateway] = canvasGraph(codex, [work], nothingOverlaid).nodes;

  expect(gateway).toEqual({ id: 'gateway', kind: 'gateway', displayName: 'Codex', port: 8397 });
});

test('a virtual model node carries the id a client asks for and the real model that answers', () => {
  const graph = canvasGraph(codex, [work], nothingOverlaid);

  expect(graph.nodes[1]).toEqual({
    id: 'model:fast',
    kind: 'virtual-model',
    modelId: 'fast',
    displayName: 'Fast',
    providerModel: 'claude-sonnet-5',
  });
});

test('a target node carries the account and the identity it reads under the provider product', () => {
  const graph = canvasGraph(codex, [work], nothingOverlaid);

  expect(graph.nodes[2]).toEqual({
    id: 'target:fast',
    kind: 'target',
    account: work,
    modelId: 'fast',
    detail: 'Work',
  });
});

test('a subscription target prefers the observed signed-in address over its stored label', () => {
  const graph = canvasGraph(codex, [work], nothingOverlaid, {}, [
    {
      id: work.id,
      provider: 'anthropic',
      label: work.label,
      standing: 'connected',
      provenance: 'sign-in',
      active: true,
      signedInAs: 'ada@example.com',
    },
  ]);

  expect(graph.nodes[2]).toMatchObject({ detail: 'ada@example.com' });
});

test('two virtual models reaching one account each keep a target card of their own', () => {
  const bothOnWork = { ...codex, virtualModels: [fast, { ...slow, target: fast.target }] };
  const graph = canvasGraph(bothOnWork, [work], nothingOverlaid);

  expect(graph.nodes.filter((node) => node.kind === 'target')).toHaveLength(2);
  expect(graph.edges.map((cable) => cable.target)).toEqual([
    'model:fast',
    'target:fast',
    'model:slow',
    'target:slow',
  ]);
});

test('a binding whose account left the registry stands as a ghost under a broken cable', () => {
  const graph = canvasGraph({ ...codex, virtualModels: [slow] }, [work], nothingOverlaid);

  expect(graph.nodes[2]).toEqual({
    id: 'ghost:slow',
    kind: 'ghost-target',
    accountId: 'a2',
    modelId: 'slow',
  });
  expect(graph.edges).toEqual([
    { id: 'wire:model:slow', source: 'gateway', target: 'model:slow', standing: 'structural' },
    { id: 'cable:slow', source: 'model:slow', target: 'ghost:slow', standing: 'broken' },
  ]);
});

test('a gateway serving nothing stands alone, with no cable to draw', () => {
  const graph = canvasGraph({ ...codex, virtualModels: [] }, [work], nothingOverlaid);

  expect(graph.nodes.map((node) => node.id)).toEqual(['gateway']);
  expect(graph.edges).toEqual([]);
});

test('a draft nobody has finished stands as its own node, wired to the gateway it belongs to', () => {
  const graph = canvasGraph({ ...codex, virtualModels: [] }, [work], {
    draft: { modelId: '', displayName: 'Faster', seat },
    pending: undefined,
  });

  expect(graph.nodes[1]).toEqual({
    id: 'draft',
    kind: 'draft-model',
    modelId: '',
    displayName: 'Faster',
  });
  expect(graph.edges).toEqual([
    { id: 'wire:draft', source: 'gateway', target: 'draft', standing: 'structural' },
  ]);
});

test('a draft naming a model nobody serves yet stands beside the ones the gateway already holds', () => {
  const drafting: DraftStanding = { modelId: 'faster', displayName: 'Faster', seat };
  const graph = canvasGraph(codex, [work], { draft: drafting, pending: undefined });

  expect(graph.nodes.map((node) => node.id)).toContain('draft');
});

test('a draft temporarily matching a stored model id keeps its separate internal node', () => {
  const drafting: DraftStanding = { modelId: 'fast', displayName: 'Fast again', seat };
  const graph = canvasGraph(codex, [work], { draft: drafting, pending: undefined });

  expect(graph.nodes.map((node) => node.id)).toContain('draft');
  expect(graph.nodes.map((node) => node.id)).toContain('model:fast');
  expect(standingsOf(graph)).toEqual(['structural', 'resting', 'structural']);
});

test('a card waiting on a pick stands at the end, wired out of the port the cable left', () => {
  const dropped: PendingStanding = { from: 'model:fast', at: seat };
  const graph = canvasGraph(codex, [work], { draft: undefined, pending: dropped });

  expect(graph.nodes.at(-1)).toEqual({ id: 'pending', kind: 'pending-target' });
  expect(graph.edges.at(-1)).toEqual({
    id: 'overlay:pending',
    source: 'model:fast',
    target: 'pending',
    standing: 'pending',
  });
});

test('a card waiting out of a port that left the canvas draws no cable to nowhere', () => {
  const dropped: PendingStanding = { from: 'model:gone', at: seat };
  const graph = canvasGraph(codex, [work], { draft: undefined, pending: dropped });

  expect(graph.nodes.at(-1)).toEqual({ id: 'pending', kind: 'pending-target' });
  expect(standingsOf(graph)).toEqual(['structural', 'resting']);
});

test('a virtual model aliased draft keeps its own cable and wire, because both namespaces stand apart', () => {
  const namesakes = {
    ...codex,
    virtualModels: [
      { id: 'draft', displayName: 'Draft', target: fast.target },
      { id: 'pending', displayName: 'Pending', target: fast.target },
    ],
  };
  const graph = canvasGraph(namesakes, [work], {
    draft: { modelId: 'faster', displayName: 'Faster', seat },
    pending: { from: 'model:draft', at: seat },
  });

  expect(graph.edges.map((cable) => cable.id)).toEqual([
    'wire:model:draft',
    'cable:draft',
    'wire:model:pending',
    'cable:pending',
    'wire:draft',
    'overlay:pending',
  ]);
});

test('a rebound virtual model drops the cable it held, and the target it left stands down', () => {
  const rebound = gatewayRebinding(codex, 'fast', {
    accountId: 'a2',
    providerModel: 'claude-opus-5',
  });
  const graph = canvasGraph(rebound, [work, spare], nothingOverlaid);

  expect(graph.edges.map((cable) => cable.target)).toEqual(['model:fast', 'target:fast']);
  expect(graph.nodes.filter((node) => node.kind === 'target')).toMatchObject([
    { id: 'target:fast', account: spare },
  ]);
});
