import type { Account, GatewayConfig } from '@recompose/contracts';

import { fc, test as propertyTest } from '@fast-check/vitest';
import { GATEWAY_CONFIG_VERSION } from '@recompose/contracts';
import { expect } from 'vitest';

import type { CanvasOverlay } from './node-graph';

import { gatewayDefining, gatewayRebinding, gatewayReleasing } from './model-draft';
import { canvasGraph } from './node-graph';

const work: Account = {
  id: 'a1',
  provider: 'anthropic',
  kind: 'subscription',
  provenance: 'sign-in',
  label: 'Work',
};

const bare: GatewayConfig = {
  schemaVersion: GATEWAY_CONFIG_VERSION,
  slug: 'codex',
  displayName: 'Codex',
  port: 8397,
  virtualModels: [],
  layout: { nodes: {} },
};

const nothingOverlaid: CanvasOverlay = { draft: undefined, pending: undefined };

const seat = { x: 320, y: 140 };

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
  return edits.reduce<GatewayConfig>(afterEdit, bare);
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
  'every virtual model and every draft hangs off the gateway by exactly one structural wire',
  (edits) => {
    const graph = canvasGraph(composed(edits), [work], {
      draft: { modelId: 'held', displayName: 'Held', seat },
      pending: undefined,
    });
    const wired = graph.nodes.filter(
      (node) => node.kind === 'virtual-model' || node.kind === 'draft-model',
    );
    const incoming = wired.map(
      (node) =>
        graph.edges.filter(
          (cable) =>
            cable.source === 'gateway' &&
            cable.target === node.id &&
            cable.standing === 'structural',
        ).length,
    );

    expect(incoming).toEqual(wired.map(() => 1));
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
