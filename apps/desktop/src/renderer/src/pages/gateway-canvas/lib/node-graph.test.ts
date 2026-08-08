import type { Account, GatewayConfig, VirtualModel } from '@recompose/contracts';

import { fc, test as propertyTest } from '@fast-check/vitest';
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

import { gatewayDefining, gatewayRebinding, gatewayReleasing } from './model-draft';
import { canvasGraph } from './node-graph';

const work: Account = { id: 'a1', provider: 'anthropic', kind: 'subscription', label: 'Work' };

const spare: Account = { id: 'a2', provider: 'openai', kind: 'subscription', label: 'Spare' };

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
  target: 'target:a1',
  standing: 'resting',
};

function standingsOf(graph: CanvasGraph): readonly CableStanding[] {
  return graph.edges.map((cable) => cable.standing);
}

test('a served gateway stands as the gateway, the virtual model, the target, and one resting cable', () => {
  const graph = canvasGraph(codex, [work], nothingOverlaid);

  expect(graph.nodes.map((node) => node.kind)).toEqual(['gateway', 'virtual-model', 'target']);
  expect(graph.edges).toEqual([fastAtRest]);
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

test('a target node carries the account it stands for, as the registry holds it', () => {
  const graph = canvasGraph(codex, [work], nothingOverlaid);

  expect(graph.nodes[2]).toEqual({ id: 'target:a1', kind: 'target', account: work });
});

test('two virtual models reaching one account stand as one target under two cables', () => {
  const bothOnWork = { ...codex, virtualModels: [fast, { ...slow, target: fast.target }] };
  const graph = canvasGraph(bothOnWork, [work], nothingOverlaid);

  expect(graph.nodes.filter((node) => node.kind === 'target')).toHaveLength(1);
  expect(graph.edges.map((cable) => cable.target)).toEqual(['target:a1', 'target:a1']);
});

test('a binding whose account left the registry stands as a ghost under a broken cable', () => {
  const graph = canvasGraph({ ...codex, virtualModels: [slow] }, [work], nothingOverlaid);

  expect(graph.nodes[2]).toEqual({ id: 'ghost:a2', kind: 'ghost-target', accountId: 'a2' });
  expect(graph.edges).toEqual([
    { id: 'cable:slow', source: 'model:slow', target: 'ghost:a2', standing: 'broken' },
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
    { id: 'overlay:draft', source: 'gateway', target: 'draft', standing: 'draft' },
  ]);
});

test('a draft naming a model nobody serves yet stands beside the ones the gateway already holds', () => {
  const drafting: DraftStanding = { modelId: 'faster', displayName: 'Faster', seat };
  const graph = canvasGraph(codex, [work], { draft: drafting, pending: undefined });

  expect(graph.nodes.map((node) => node.id)).toContain('draft');
});

test('a draft naming a model the gateway already serves stands down, so the stored binding wins', () => {
  const drafting: DraftStanding = { modelId: 'fast', displayName: 'Fast again', seat };
  const graph = canvasGraph(codex, [work], { draft: drafting, pending: undefined });

  expect(graph.nodes.map((node) => node.id)).toEqual(['gateway', 'model:fast', 'target:a1']);
  expect(standingsOf(graph)).toEqual(['resting']);
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
  expect(standingsOf(graph)).toEqual(['resting']);
});

test('a virtual model aliased draft keeps its own cable, because the overlay cables stand apart', () => {
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
    'cable:draft',
    'cable:pending',
    'overlay:draft',
    'overlay:pending',
  ]);
});

test('a rebound virtual model drops the cable it held, and the target it left stands down', () => {
  const rebound = gatewayRebinding(codex, 'fast', {
    accountId: 'a2',
    providerModel: 'claude-opus-5',
  });
  const graph = canvasGraph(rebound, [work, spare], nothingOverlaid);

  expect(graph.edges.map((cable) => cable.target)).toEqual(['target:a2']);
  expect(graph.nodes.map((node) => node.id)).not.toContain('target:a1');
});

type Edit =
  | { act: 'define'; accountId: string }
  | { act: 'rebind'; at: number; accountId: string }
  | { act: 'release'; at: number };

const reachable = fc.constantFrom('a1', 'a2', 'a3');

const anyEditing = fc.array(
  fc.oneof(
    fc.record({ act: fc.constant('define' as const), accountId: reachable }),
    fc.record({
      act: fc.constant('rebind' as const),
      at: fc.nat({ max: 20 }),
      accountId: reachable,
    }),
    fc.record({ act: fc.constant('release' as const), at: fc.nat({ max: 20 }) }),
  ),
  { maxLength: 14 },
);

const aliasesTheOverlayAlsoUses = ['draft', 'pending'];

function aliasAt(index: number): string {
  return aliasesTheOverlayAlsoUses[index] ?? `model-${String(index)}`;
}

function afterEdit(gateway: GatewayConfig, edit: Edit, index: number): GatewayConfig {
  if (edit.act === 'define') {
    return gatewayDefining(gateway, {
      displayName: `Model ${String(index)}`,
      id: aliasAt(index),
      accountId: edit.accountId,
      providerModel: 'claude-sonnet-5',
    });
  }

  const held = gateway.virtualModels[edit.at % Math.max(gateway.virtualModels.length, 1)];

  if (held === undefined) {
    return gateway;
  }

  return edit.act === 'rebind'
    ? gatewayRebinding(gateway, held.id, {
        accountId: edit.accountId,
        providerModel: 'claude-opus-5',
      })
    : gatewayReleasing(gateway, held.id);
}

function composed(edits: readonly Edit[]): GatewayConfig {
  return edits.reduce<GatewayConfig>(afterEdit, { ...codex, virtualModels: [] });
}

propertyTest.prop([anyEditing])(
  'a virtual model answers through exactly one cable, whatever a person edited to get there',
  (edits) => {
    const graph = canvasGraph(composed(edits), [work], nothingOverlaid);
    const models = graph.nodes.filter((node) => node.kind === 'virtual-model');
    const outgoing = models.map(
      (node) => graph.edges.filter((cable) => cable.source === node.id).length,
    );

    expect(outgoing).toEqual(models.map(() => 1));
  },
);

propertyTest.prop([anyEditing])(
  'every cable joins two cards the canvas actually stands, whatever the overlay holds',
  (edits) => {
    const graph = canvasGraph(composed(edits), [work], {
      draft: { modelId: 'draft', displayName: 'Held', seat },
      pending: { from: 'model:draft', at: seat },
    });
    const standing = new Set(graph.nodes.map((node) => node.id));
    const joined = graph.edges.filter(
      (cable) => standing.has(cable.source) && standing.has(cable.target),
    );

    expect(joined).toEqual(graph.edges);
  },
);

propertyTest.prop([anyEditing])(
  'no two cards and no two cables ever stand under one id',
  (edits) => {
    const graph = canvasGraph(composed(edits), [work], {
      draft: { modelId: 'held', displayName: 'Held', seat },
      pending: { from: 'model:draft', at: seat },
    });
    const minted = [...graph.nodes.map((node) => node.id), ...graph.edges.map((c) => c.id)];

    expect(new Set(minted).size).toBe(minted.length);
  },
);
