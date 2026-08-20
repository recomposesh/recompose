import type { Account, GatewayConfig, GatewayJudging, VirtualModel } from '@recompose/contracts';

import { GATEWAY_CONFIG_VERSION } from '@recompose/contracts';
import { expect, test } from 'vitest';

import type { CanvasEdge, CanvasGraph } from './node-graph';

import { drawnAsATie } from './cable-standing';
import { canvasGraph } from './node-graph';

const work: Account = {
  id: 'a1',
  provider: 'anthropic',
  kind: 'api-key',
  label: 'Work',
  credentialRef: 'c1',
};

const judgedModel: VirtualModel = {
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

const codex: GatewayConfig = {
  schemaVersion: GATEWAY_CONFIG_VERSION,
  slug: 'codex',
  displayName: 'Codex',
  port: 8397,
  virtualModels: [judgedModel],
  layout: { nodes: {} },
};

function graph(judging: GatewayJudging = {}): CanvasGraph {
  return canvasGraph(codex, [work], { draft: undefined, pending: undefined }, {}, [], Date.now(), {
    judging,
  });
}

function tieIn(edges: readonly CanvasEdge[]): CanvasEdge | undefined {
  return edges.find((edge) => drawnAsATie(edge.id));
}

test('a conditional router stands its judge on the canvas beside the children it spreads over', () => {
  expect(graph().nodes.map((node) => node.kind)).toEqual([
    'gateway',
    'virtual-model',
    'router',
    'judge',
    'target',
    'target',
  ]);
});

test('the judge hangs off its router by a tie rather than by a binding cable', () => {
  const tie = tieIn(graph().edges);

  expect(tie).toMatchObject({
    id: 'tie:fast:advisor',
    source: 'route:fast',
    target: 'judge:fast:advisor',
    standing: 'resting',
  });
});

test('the tie leaves the shoulder port, so it never crosses the cables to the children', () => {
  expect(tieIn(graph().edges)?.sourceHandle).toBe('judge');
});

test('the judge takes no binding cable of its own, because no request is routed to it', () => {
  const cables = graph().edges.filter((edge) => !drawnAsATie(edge.id));

  expect(cables.map((edge) => edge.target)).toEqual([
    'model:fast',
    'route:fast',
    'target:fast:first',
    'target:fast:second',
  ]);
});

test('the tie lights while the router it leaves is waiting on its judge', () => {
  const tie = tieIn(graph({ codex: { fast: { ladder: 1 } } }).edges);

  expect(tie?.judging).toBe(true);
});

test('the tie rests once the classification settles', () => {
  const tie = tieIn(graph({ codex: { fast: { ladder: 0 } } }).edges);

  expect(tie?.judging).toBe(false);
});

test('a count filed under the judge rather than the router lights nothing', () => {
  const tie = tieIn(graph({ codex: { fast: { advisor: 1 } } }).edges);

  expect(tie?.judging).toBe(false);
});

test('a tie whose gateway is judging nothing rests', () => {
  expect(tieIn(graph().edges)?.judging).toBe(false);
});
