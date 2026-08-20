import type { GatewayConfig } from '@recompose/contracts';

import { GATEWAY_CONFIG_VERSION } from '@recompose/contracts';
import { expect, test } from 'vitest';

import { canvasGraph } from './node-graph';
import { tidyPositions } from './tidy-layout';
import { columnStep, nodeOfKind, oneRouterDeep, seatAt, work } from './tidy-layout.testkit';

function directlyBound(id: string, providerModel: string) {
  return {
    id,
    displayName: id,
    routing: {
      entry: 'one',
      nodes: { one: { kind: 'target', accountId: 'a1', providerModel } },
    },
  } as const;
}

/**
 * A gateway whose judged definition is composed last, which is where the drawer births one.
 *
 * @summary The two plain definitions ahead of it fill the rows a router would otherwise have taken
 * on an empty canvas, which is the arrangement the far seat only ever showed up in.
 */
const crowdedGateway: GatewayConfig = {
  schemaVersion: GATEWAY_CONFIG_VERSION,
  slug: 'codex',
  displayName: 'Codex',
  port: 8397,
  virtualModels: [
    directlyBound('fast', 'claude-sonnet-5'),
    directlyBound('slow', 'claude-opus-5'),
    {
      id: 'judged',
      displayName: 'Judged',
      routing: {
        entry: 'r1',
        nodes: {
          r1: {
            kind: 'router',
            policy: {
              mode: 'conditional',
              judge: 'advisor',
              branches: [],
              elseChild: 'c1',
              judgeBoundMs: 3000,
              rejudgeEveryRequest: false,
            },
            children: ['c1'],
          },
          c1: { kind: 'target', accountId: 'a1', providerModel: 'qwen3' },
          advisor: { kind: 'target', accountId: 'a1', providerModel: 'claude-haiku-4-5' },
        },
      },
    },
  ],
  layout: { nodes: {} },
};

test('a conditional router seats its else child in the next column, beside it', () => {
  const graph = canvasGraph(crowdedGateway, [work], { draft: undefined, pending: undefined });
  const seats = tidyPositions(graph.nodes);
  const router = seatAt(seats, 'route:judged');
  const elseChild = seatAt(seats, 'target:judged:c1');

  expect(elseChild).toEqual({ x: router.x + columnStep(), y: router.y });
});

test("a router's first child takes its parent's row rather than the top of the column", () => {
  const seats = tidyPositions([
    nodeOfKind.target('target:fast'),
    nodeOfKind.router('route:slow'),
    oneRouterDeep('target:slow:only', 1),
  ]);

  expect(seatAt(seats, 'route:slow').y).toBeGreaterThan(0);
  expect(seatAt(seats, 'target:slow:only').y).toBe(seatAt(seats, 'route:slow').y);
});

test("a router's later children stack below the first, so the cables fan without crossing", () => {
  const seats = tidyPositions([
    nodeOfKind['virtual-model']('model:slow'),
    nodeOfKind.router('route:slow'),
    oneRouterDeep('target:slow:first', 1),
    oneRouterDeep('target:slow:second', 1),
  ]);

  expect(seatAt(seats, 'target:slow:second').y).toBeGreaterThan(
    seatAt(seats, 'target:slow:first').y,
  );
});
