import type { Account, GatewayConfig } from '@recompose/contracts';

import { fc, test as propertyTest } from '@fast-check/vitest';
import { GATEWAY_CONFIG_VERSION } from '@recompose/contracts';
import { expect, test } from 'vitest';

import type { NodePositions, XY } from './canvas-positions';
import type { CanvasNode, CanvasNodeKind } from './node-graph';

import { canvasGraph } from './node-graph';
import {
  childSeatBeside,
  MODEL_COLUMN,
  ROUTE_COLUMN,
  seatForNewNode,
  tidyPositions,
} from './tidy-layout';

const work: Account = {
  id: 'a1',
  provider: 'anthropic',
  kind: 'subscription',
  provenance: 'sign-in',
  label: 'Work',
};

const nodeOfKind: Record<CanvasNodeKind, (id: string) => CanvasNode> = {
  gateway: (id) => ({ id, kind: 'gateway', displayName: 'Codex', port: 8397 }),
  'virtual-model': (id) => ({
    id,
    kind: 'virtual-model',
    modelId: 'fast',
    displayName: 'Fast',
    providerModel: 'claude-sonnet-5',
  }),
  target: (id) => ({
    id,
    kind: 'target',
    account: work,
    modelId: 'fast',
    routeNodeId: id,
    depth: 0,
  }),
  'ghost-target': (id) => ({
    id,
    kind: 'ghost-target',
    accountId: 'a2',
    modelId: 'slow',
    routeNodeId: id,
    depth: 0,
  }),
  router: (id) => ({
    id,
    kind: 'router',
    modelId: 'fast',
    routeNodeId: id,
    depth: 0,
    mode: 'failover',
    displayName: undefined,
    childCount: 2,
  }),
  'draft-model': (id) => ({ id, kind: 'draft-model', modelId: '', displayName: '' }),
  'pending-target': (id) => ({ id, kind: 'pending-target' }),
};

const columnRank: Record<CanvasNodeKind, number> = {
  gateway: 0,
  'virtual-model': 1,
  'draft-model': 1,
  target: 2,
  'ghost-target': 2,
  router: 2,
  'pending-target': 2,
};

const anyCanvas = fc.array(
  fc.constantFrom<CanvasNodeKind>(
    'gateway',
    'virtual-model',
    'target',
    'ghost-target',
    'router',
    'draft-model',
    'pending-target',
  ),
  { maxLength: 12 },
);

function seatAt(seats: NodePositions, id: string): XY {
  const seat = seats[id];

  if (seat === undefined) {
    throw new Error(`the arrangement seats nothing under "${id}"`);
  }

  return seat;
}

function canvasOf(kinds: readonly CanvasNodeKind[]): readonly CanvasNode[] {
  return kinds.map((kind, index) => nodeOfKind[kind](`${kind}-${String(index)}`));
}

function columnStep(): number {
  const seats = tidyPositions(canvasOf(['gateway', 'virtual-model']));

  return seatAt(seats, 'virtual-model-1').x - seatAt(seats, 'gateway-0').x;
}

function oneRouterDeep(id: string, depth: number): CanvasNode {
  return {
    id,
    kind: 'target',
    account: work,
    modelId: 'fast',
    routeNodeId: id,
    depth,
  };
}

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

test('a gateway holding no router seats every card exactly where it seated before', () => {
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
    'model:slow': { x: 320, y: 150 },
    'target:slow': { x: 640, y: 150 },
  });
});

test("a child born beside its parent seats one column out, on the parent's own row", () => {
  expect(childSeatBeside({ x: 320, y: 150 })).toEqual({ x: 320 + columnStep(), y: 150 });
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
