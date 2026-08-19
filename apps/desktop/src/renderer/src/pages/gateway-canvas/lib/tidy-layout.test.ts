import type { GatewayConfig } from '@recompose/contracts';

import { test as propertyTest } from '@fast-check/vitest';
import { GATEWAY_CONFIG_VERSION } from '@recompose/contracts';
import { expect, test } from 'vitest';

import { canvasGraph } from './node-graph';
import {
  childSeatBeside,
  columnBeyond,
  MODEL_COLUMN,
  ROUTE_COLUMN,
  seatForNewNode,
  tidyPositions,
} from './tidy-layout';
import {
  anyCanvas,
  canvasOf,
  columnRank,
  columnStep,
  nodeOfKind,
  oneRouterDeep,
  seatAt,
  work,
} from './tidy-layout.testkit';

test('the gateway seats at the origin, which is the leading edge every column reads from', () => {
  expect(seatAt(tidyPositions(canvasOf(['gateway'])), 'gateway-0')).toEqual({ x: 0, y: 0 });
});

test('virtual models stack downward in the order the gateway holds them', () => {
  const seats = tidyPositions(canvasOf(['gateway', 'virtual-model', 'virtual-model']));
  const first = seatAt(seats, 'virtual-model-1');
  const second = seatAt(seats, 'virtual-model-2');

  expect(second.x).toBe(first.x);
  expect(second.y).toBeGreaterThan(first.y);
});

test('a target seats two columns out, so its cable reads at a glance', () => {
  const seats = tidyPositions(canvasOf(['gateway', 'virtual-model', 'target']));
  const step = columnStep();

  expect(seatAt(seats, 'target-2').x).toBe(step * 2);
});

test('a router seats where a directly bound target seats, because it stands in that place', () => {
  const seats = tidyPositions(canvasOf(['gateway', 'virtual-model', 'router']));

  expect(seatAt(seats, 'router-2').x).toBe(columnStep() * 2);
});

test('a target one router down seats one pitch further out again', () => {
  const seats = tidyPositions([nodeOfKind.router('ladder'), oneRouterDeep('child', 1)]);

  expect(seatAt(seats, 'child').x).toBe(seatAt(seats, 'ladder').x + columnStep());
});

test('a target two routers down seats two pitches out from where a direct binding would', () => {
  const seats = tidyPositions([oneRouterDeep('deep', 2)]);

  expect(seatAt(seats, 'deep').x).toBe(columnStep() * 4);
});

test("a router's children stack on adjacent rows, in the order the ladder declares them", () => {
  const seats = tidyPositions([
    nodeOfKind.router('ladder'),
    oneRouterDeep('first', 1),
    oneRouterDeep('second', 1),
  ]);

  expect(seatAt(seats, 'second').x).toBe(seatAt(seats, 'first').x);
  expect(seatAt(seats, 'second').y).toBeGreaterThan(seatAt(seats, 'first').y);
});

test('a draft seats among the virtual models, and a waiting card among the targets', () => {
  const seats = tidyPositions(
    canvasOf(['virtual-model', 'draft-model', 'target', 'pending-target']),
  );

  expect(seatAt(seats, 'draft-model-1').x).toBe(seatAt(seats, 'virtual-model-0').x);
  expect(seatAt(seats, 'pending-target-3').x).toBe(seatAt(seats, 'target-2').x);
});

test('a ghost seats among the targets, where the account it stands for used to', () => {
  const seats = tidyPositions(canvasOf(['target', 'ghost-target']));

  expect(seatAt(seats, 'ghost-target-1').x).toBe(seatAt(seats, 'target-0').x);
});

test('a gateway holding no router seats each model on its own row, its target beside it', () => {
  const stored: GatewayConfig = {
    schemaVersion: GATEWAY_CONFIG_VERSION,
    slug: 'codex',
    displayName: 'Codex',
    port: 8397,
    virtualModels: [
      {
        id: 'fast',
        displayName: 'Fast',
        routing: {
          entry: 'one',
          nodes: { one: { kind: 'target', accountId: 'a1', providerModel: 'claude-sonnet-5' } },
        },
      },
      {
        id: 'slow',
        displayName: 'Slow',
        routing: {
          entry: 'two',
          nodes: { two: { kind: 'target', accountId: 'a1', providerModel: 'claude-opus-5' } },
        },
      },
    ],
    layout: { nodes: {} },
  };
  const graph = canvasGraph(stored, [work], { draft: undefined, pending: undefined });

  expect(tidyPositions(graph.nodes)).toEqual({
    gateway: { x: 0, y: 0 },
    'model:fast': { x: 320, y: 0 },
    'target:fast': { x: 640, y: 0 },
    'model:slow': { x: 320, y: 176 },
    'target:slow': { x: 640, y: 176 },
  });
});

test("a child born beside its parent seats one column out, on the parent's own row", () => {
  expect(childSeatBeside({ x: 320, y: 150 })).toEqual({ x: 320 + columnStep(), y: 150 });
});

test('a card bound from another stands one column beyond the card it was bound from', () => {
  expect([
    columnBeyond(nodeOfKind['virtual-model']('model:fast')),
    columnBeyond(nodeOfKind['draft-model']('draft')),
    columnBeyond(nodeOfKind.router('route:fast')),
    columnBeyond(oneRouterDeep('route:fast:r2', 1)),
  ]).toEqual([ROUTE_COLUMN, ROUTE_COLUMN, ROUTE_COLUMN + 1, ROUTE_COLUMN + 2]);
});

test('a card bound from nothing the canvas stands falls back to the binding column', () => {
  expect(columnBeyond(undefined)).toBe(ROUTE_COLUMN);
});

test('a new virtual model is born below the lowest card already standing in its column', () => {
  const placed = tidyPositions(canvasOf(['gateway', 'virtual-model', 'virtual-model']));
  const born = seatForNewNode(MODEL_COLUMN, placed);
  const lowest = seatAt(placed, 'virtual-model-2');

  expect(born.x).toBe(lowest.x);
  expect(born.y).toBeGreaterThan(lowest.y);
});

test('a card born into a column lands exactly where tidying it in would have seated it', () => {
  const placed = tidyPositions(canvasOf(['gateway', 'virtual-model']));
  const grown = tidyPositions(canvasOf(['gateway', 'virtual-model', 'virtual-model']));

  expect(seatForNewNode(MODEL_COLUMN, placed)).toEqual(seatAt(grown, 'virtual-model-2'));
});

test('a new card is born at the top of a column holding nothing yet', () => {
  const placed = tidyPositions(canvasOf(['gateway']));

  expect(seatForNewNode(MODEL_COLUMN, placed)).toEqual({ x: columnStep(), y: 0 });
});

test('a new card reads only its own column, so cards standing elsewhere never push it down', () => {
  const placed = tidyPositions(canvasOf(['gateway', 'virtual-model', 'virtual-model']));

  expect(seatForNewNode(ROUTE_COLUMN, placed)).toEqual({ x: columnStep() * 2, y: 0 });
});

test('a card born below one a person dragged low follows the drag rather than the tidy seat', () => {
  const dragged = { 'virtual-model-0': { x: columnStep(), y: 900 } };

  expect(seatForNewNode(MODEL_COLUMN, dragged).y).toBeGreaterThan(900);
});

propertyTest.prop([anyCanvas])('no two cards ever seat in the same place', (kinds) => {
  const seats = tidyPositions(canvasOf(kinds));
  const taken = Object.values(seats).map((seat) => `${String(seat.x)},${String(seat.y)}`);

  expect(new Set(taken).size).toBe(kinds.length);
});

propertyTest.prop([anyCanvas])('every card seats in the column its role owns', (kinds) => {
  const nodes = canvasOf(kinds);
  const columns = [0, columnStep(), columnStep() * 2];
  const seats = tidyPositions(nodes);

  expect(nodes.map((node) => seatAt(seats, node.id).x)).toEqual(
    nodes.map((node) => columns[columnRank[node.kind]]),
  );
});

propertyTest.prop([anyCanvas])(
  'the same canvas tidies to the same arrangement every time',
  (kinds) => {
    expect(tidyPositions(canvasOf(kinds))).toEqual(tidyPositions(canvasOf(kinds)));
  },
);
