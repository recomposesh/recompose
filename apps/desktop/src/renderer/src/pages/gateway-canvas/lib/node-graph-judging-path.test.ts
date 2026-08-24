import type {
  Account,
  GatewayConfig,
  GatewayJudging,
  GatewayTraffic,
  VirtualModel,
} from '@recompose/contracts';

import { GATEWAY_CONFIG_VERSION } from '@recompose/contracts';
import { describe, expect, test } from 'vitest';

import type { CanvasEdge, CanvasGraph } from './node-graph';

import { canvasGraph } from './node-graph';

const work: Account = {
  id: 'a1',
  provider: 'anthropic',
  kind: 'api-key',
  label: 'Work',
  credentialRef: 'c1',
};

const NOW = 1_754_600_000_500;

const judged: VirtualModel = {
  id: 'fast',
  displayName: 'Fast',
  routing: {
    entry: 'ladder',
    nodes: {
      ladder: {
        kind: 'router',
        policy: {
          mode: 'conditional',
          judge: 'advisor',
          branches: [{ label: 'code', rule: 'It writes code.', child: 'first' }],
          elseChild: 'second',
          judgeBoundMs: 3000,
          rejudgeEveryRequest: false,
        },
        children: ['first', 'second'],
      },
      first: { kind: 'target', accountId: 'a1', providerModel: 'claude-sonnet-5' },
      second: { kind: 'target', accountId: 'a1', providerModel: 'claude-opus-5' },
      advisor: { kind: 'target', accountId: 'a1', providerModel: 'claude-haiku-5' },
    },
  },
};

const judgedInside: VirtualModel = {
  id: 'fast',
  displayName: 'Fast',
  routing: {
    entry: 'outer',
    nodes: {
      outer: { kind: 'router', policy: { mode: 'failover' }, children: ['inner'] },
      inner: {
        kind: 'router',
        policy: {
          mode: 'conditional',
          judge: 'advisor',
          branches: [{ label: 'code', rule: 'It writes code.', child: 'leaf' }],
          elseChild: 'spare',
          judgeBoundMs: 3000,
          rejudgeEveryRequest: false,
        },
        children: ['leaf', 'spare'],
      },
      leaf: { kind: 'target', accountId: 'a1', providerModel: 'claude-sonnet-5' },
      spare: { kind: 'target', accountId: 'a1', providerModel: 'claude-opus-5' },
      advisor: { kind: 'target', accountId: 'a1', providerModel: 'claude-haiku-5' },
    },
  },
};

const codex: GatewayConfig = {
  schemaVersion: GATEWAY_CONFIG_VERSION,
  slug: 'codex',
  displayName: 'Codex',
  port: 8397,
  virtualModels: [judged],
  layout: { nodes: {} },
};

function graph(
  judging: GatewayJudging = {},
  traffic: GatewayTraffic = {},
  gateway: GatewayConfig = codex,
): CanvasGraph {
  return canvasGraph(gateway, [work], { draft: undefined, pending: undefined }, traffic, [], NOW, {
    judging,
  });
}

function cableIn(built: CanvasGraph, id: string): CanvasEdge | undefined {
  return built.edges.find((edge) => edge.id === id);
}

const WAITING: GatewayJudging = { codex: { fast: { ladder: 1 } } };

describe('what the canvas says while a router waits on its judge', () => {
  test('the gateway wire lights, because the request is inside the model being decided on', () => {
    expect(cableIn(graph(WAITING), 'wire:model:fast')?.standing).toBe('live');
  });

  test('the cable into the waiting router lights, so the path reads whole down to the decision', () => {
    expect(cableIn(graph(WAITING), 'cable:fast')?.standing).toBe('live');
  });

  test('the children of the waiting router rest, because no request has reached one yet', () => {
    const built = graph(WAITING);

    expect(cableIn(built, 'cable:fast:first')?.standing).toBe('resting');
    expect(cableIn(built, 'cable:fast:second')?.standing).toBe('resting');
  });

  test('the routers above a waiting one light too, so a nested table lights every segment', () => {
    const nested: GatewayJudging = { codex: { fast: { inner: 1 } } };
    const built = graph(nested, {}, { ...codex, virtualModels: [judgedInside] });

    expect(cableIn(built, 'wire:model:fast')?.standing).toBe('live');
    expect(cableIn(built, 'cable:fast')?.standing).toBe('live');
    expect(cableIn(built, 'cable:fast:inner')?.standing).toBe('live');
  });

  test('the wire carries no failure to press, because nothing has failed yet', () => {
    expect(cableIn(graph(WAITING), 'wire:model:fast')?.failure).toBeUndefined();
  });

  test('a decision under way outranks the failure the last request left', () => {
    const refused: GatewayTraffic = {
      codex: {
        fast: {
          first: { outcome: 'failed', at: NOW - 1000, status: 429, detail: 'Turned away.' },
        },
      },
    };
    const built = graph(WAITING, refused);

    expect(cableIn(built, 'wire:model:fast')?.standing).toBe('live');
    expect(cableIn(built, 'cable:fast:first')?.standing).toBe('failed');
  });
});

describe('what the canvas says once no router is waiting', () => {
  test('the gateway wire falls back to the frame it draws at rest', () => {
    const settled: GatewayJudging = { codex: { fast: { ladder: 0 } } };

    expect(cableIn(graph(settled), 'wire:model:fast')?.standing).toBe('structural');
  });

  test('the cable into the router rests once the classification settles', () => {
    const settled: GatewayJudging = { codex: { fast: { ladder: 0 } } };

    expect(cableIn(graph(settled), 'cable:fast')?.standing).toBe('resting');
  });

  test('a count filed under the judge rather than the router lights nothing', () => {
    const misfiled: GatewayJudging = { codex: { fast: { advisor: 1 } } };
    const built = graph(misfiled);

    expect(cableIn(built, 'wire:model:fast')?.standing).toBe('structural');
    expect(cableIn(built, 'cable:fast')?.standing).toBe('resting');
  });
});
