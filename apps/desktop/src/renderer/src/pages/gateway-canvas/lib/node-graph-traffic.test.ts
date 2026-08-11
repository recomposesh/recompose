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

const JUST_AFTER = 1_754_600_000_500;

const A_MINUTE_LATER = 1_754_600_061_000;

function graphAt(traffic: GatewayTraffic, now: number, gateway: GatewayConfig = codex) {
  return canvasGraph(gateway, [work], nothingOverlaid, traffic, [], now);
}

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
    const graph = graphAt({}, JUST_AFTER);

    expect(standingsOf(graph)).toEqual(['structural', 'resting']);
  });

  test('a virtual model whose last request was served paints both its cables served', () => {
    const graph = graphAt(flowed, JUST_AFTER);

    expect(standingsOf(graph)).toEqual(['served', 'served']);
  });

  test('a request still in flight paints both its cables live', () => {
    const inFlight: GatewayTraffic = {
      codex: { fast: { outcome: 'live', at: 1_754_600_000_000 } },
    };

    expect(standingsOf(graphAt(inFlight, JUST_AFTER))).toEqual(['live', 'live']);
  });

  test('a request in flight stays live however long it has been running', () => {
    const inFlight: GatewayTraffic = {
      codex: { fast: { outcome: 'live', at: 1_754_600_000_000 } },
    };

    expect(standingsOf(graphAt(inFlight, A_MINUTE_LATER))).toEqual(['live', 'live']);
  });

  test('a served virtual model leaves no failure on either cable, so nothing stands to be read', () => {
    const graph = graphAt(flowed, JUST_AFTER);

    expect(cableIn(graph, 'cable:fast')?.failure).toBeUndefined();
    expect(cableIn(graph, 'wire:model:fast')?.failure).toBeUndefined();
  });

  test('traffic recorded under another gateway paints nothing on this one', () => {
    const elsewhere: GatewayTraffic = {
      other: { fast: { outcome: 'served', at: 1_754_600_000_000 } },
    };
    const graph = graphAt(elsewhere, JUST_AFTER);

    expect(standingsOf(graph)).toEqual(['structural', 'resting']);
  });

  test('traffic recorded for a definition the gateway no longer serves paints nothing', () => {
    const departed: GatewayTraffic = {
      codex: { removed: { outcome: 'failed', at: 1, status: 500, detail: 'It fell over.' } },
    };
    const graph = graphAt(departed, JUST_AFTER);

    expect(standingsOf(graph)).toEqual(['structural', 'resting']);
  });
});

describe('what a failed virtual model hands a person to read', () => {
  test('a virtual model whose last request failed paints both its cables failed', () => {
    const graph = graphAt(wentRed, JUST_AFTER);

    expect(standingsOf(graph)).toEqual(['failed', 'failed']);
  });

  test('a failed virtual model carries the status and the sentence on its binding cable', () => {
    const graph = graphAt(wentRed, JUST_AFTER);

    expect(cableIn(graph, 'cable:fast')?.failure).toEqual({
      status: 502,
      detail: 'The gateway could not reach the target.',
    });
  });

  test('the gateway wire of a failed virtual model carries no failure, so one model reads one error', () => {
    const graph = graphAt(wentRed, JUST_AFTER);

    expect(cableIn(graph, 'wire:model:fast')?.failure).toBeUndefined();
  });

  test('a binding whose account left the registry stays broken, whatever last flowed through it', () => {
    const stale: GatewayTraffic = { codex: { slow: { outcome: 'served', at: 1_754_600_000_000 } } };
    const graph = graphAt(stale, JUST_AFTER, { ...codex, virtualModels: [stranded] });

    expect(standingsOf(graph)).toEqual(['structural', 'broken']);
    expect(cableIn(graph, 'cable:slow')?.failure).toBeUndefined();
  });
});

describe('how the tints cool once the traffic goes quiet', () => {
  test('a served reading cools back to rest once the minute passes it by', () => {
    expect(standingsOf(graphAt(flowed, A_MINUTE_LATER))).toEqual(['structural', 'resting']);
  });

  test('a served reading still warm at the minute edge keeps its tint', () => {
    const atTheEdge = 1_754_600_000_000 + 60_000;

    expect(standingsOf(graphAt(flowed, atTheEdge))).toEqual(['served', 'served']);
  });

  test('a failure stays on the cable however long the traffic stays quiet', () => {
    expect(standingsOf(graphAt(wentRed, A_MINUTE_LATER))).toEqual(['failed', 'failed']);
  });
});
