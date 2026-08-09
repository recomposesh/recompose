import type { Account, GatewayConfig, GatewayTraffic, VirtualModel } from '@recompose/contracts';

import { GATEWAY_CONFIG_VERSION } from '@recompose/contracts';
import { describe, expect, test } from 'vitest';

import type { CableStanding, CanvasEdge, CanvasGraph, CanvasOverlay } from './node-graph';

import { canvasGraph } from './node-graph';

const work: Account = { id: 'a1', provider: 'anthropic', kind: 'subscription', label: 'Work' };

const fast: VirtualModel = {
  id: 'fast',
  displayName: 'Fast',
  target: { accountId: 'a1', providerModel: 'claude-sonnet-5' },
};

const stranded: VirtualModel = {
  id: 'slow',
  displayName: 'Slow',
  target: { accountId: 'gone', providerModel: 'claude-opus-5' },
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

const flowed: GatewayTraffic = { codex: { fast: { outcome: 'served', at: 1_754_600_000_000 } } };

const wentRed: GatewayTraffic = {
  codex: {
    fast: {
      outcome: 'failed',
      at: 1_754_600_000_001,
      status: 502,
      detail: 'The gateway could not reach the target.',
    },
  },
};

function standingsOf(graph: CanvasGraph): readonly CableStanding[] {
  return graph.edges.map((cable) => cable.standing);
}

function cableIn(graph: CanvasGraph, id: string): CanvasEdge | undefined {
  return graph.edges.find((cable) => cable.id === id);
}

describe('what the cables of a virtual model say about the traffic they carried', () => {
  test('a virtual model nothing has flowed through yet keeps the cables it stands with at rest', () => {
    const graph = canvasGraph(codex, [work], nothingOverlaid, {});

    expect(standingsOf(graph)).toEqual(['structural', 'resting']);
  });

  test('a virtual model whose last request was served paints both its cables served', () => {
    const graph = canvasGraph(codex, [work], nothingOverlaid, flowed);

    expect(standingsOf(graph)).toEqual(['served', 'served']);
  });

  test('a served virtual model leaves no failure on either cable, so nothing stands to be read', () => {
    const graph = canvasGraph(codex, [work], nothingOverlaid, flowed);

    expect(cableIn(graph, 'cable:fast')?.failure).toBeUndefined();
    expect(cableIn(graph, 'wire:model:fast')?.failure).toBeUndefined();
  });

  test('traffic recorded under another gateway paints nothing on this one', () => {
    const elsewhere: GatewayTraffic = {
      other: { fast: { outcome: 'served', at: 1_754_600_000_000 } },
    };
    const graph = canvasGraph(codex, [work], nothingOverlaid, elsewhere);

    expect(standingsOf(graph)).toEqual(['structural', 'resting']);
  });

  test('traffic recorded for a definition the gateway no longer serves paints nothing', () => {
    const departed: GatewayTraffic = {
      codex: { removed: { outcome: 'failed', at: 1, status: 500, detail: 'It fell over.' } },
    };
    const graph = canvasGraph(codex, [work], nothingOverlaid, departed);

    expect(standingsOf(graph)).toEqual(['structural', 'resting']);
  });
});

describe('what a failed virtual model hands a person to read', () => {
  test('a virtual model whose last request failed paints both its cables failed', () => {
    const graph = canvasGraph(codex, [work], nothingOverlaid, wentRed);

    expect(standingsOf(graph)).toEqual(['failed', 'failed']);
  });

  test('a failed virtual model carries the status and the sentence on its binding cable', () => {
    const graph = canvasGraph(codex, [work], nothingOverlaid, wentRed);

    expect(cableIn(graph, 'cable:fast')?.failure).toEqual({
      status: 502,
      detail: 'The gateway could not reach the target.',
    });
  });

  test('the gateway wire of a failed virtual model carries no failure, so one model reads one error', () => {
    const graph = canvasGraph(codex, [work], nothingOverlaid, wentRed);

    expect(cableIn(graph, 'wire:model:fast')?.failure).toBeUndefined();
  });

  test('a binding whose account left the registry stays broken, whatever last flowed through it', () => {
    const stale: GatewayTraffic = { codex: { slow: { outcome: 'served', at: 1 } } };
    const graph = canvasGraph({ ...codex, virtualModels: [stranded] }, [work], nothingOverlaid, {
      ...stale,
    });

    expect(standingsOf(graph)).toEqual(['structural', 'broken']);
    expect(cableIn(graph, 'cable:slow')?.failure).toBeUndefined();
  });
});
