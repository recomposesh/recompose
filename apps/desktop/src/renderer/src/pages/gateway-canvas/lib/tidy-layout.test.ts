import type { Account } from '@recompose/contracts';

import { fc, test as propertyTest } from '@fast-check/vitest';
import { expect, test } from 'vitest';

import type { NodePositions, XY } from './canvas-positions';
import type { CanvasNode, CanvasNodeKind } from './node-graph';

import { seatForNewNode, tidyPositions } from './tidy-layout';

const work: Account = { id: 'a1', provider: 'anthropic', kind: 'subscription', label: 'Work' };

const nodeOfKind: Record<CanvasNodeKind, (id: string) => CanvasNode> = {
  gateway: (id) => ({ id, kind: 'gateway', displayName: 'Codex', port: 8397 }),
  'virtual-model': (id) => ({
    id,
    kind: 'virtual-model',
    modelId: 'fast',
    displayName: 'Fast',
    providerModel: 'claude-sonnet-5',
  }),
  target: (id) => ({ id, kind: 'target', account: work, modelId: 'fast' }),
  'ghost-target': (id) => ({ id, kind: 'ghost-target', accountId: 'a2', modelId: 'slow' }),
  'draft-model': (id) => ({ id, kind: 'draft-model', modelId: '', displayName: '' }),
  'pending-target': (id) => ({ id, kind: 'pending-target' }),
};

const columnRank: Record<CanvasNodeKind, number> = {
  gateway: 0,
  'virtual-model': 1,
  'draft-model': 1,
  target: 2,
  'ghost-target': 2,
  'pending-target': 2,
};

const anyCanvas = fc.array(
  fc.constantFrom<CanvasNodeKind>(
    'gateway',
    'virtual-model',
    'target',
    'ghost-target',
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

test('a new virtual model is born below the lowest card already standing in its column', () => {
  const placed = tidyPositions(canvasOf(['gateway', 'virtual-model', 'virtual-model']));
  const born = seatForNewNode('virtual-model', placed);
  const lowest = seatAt(placed, 'virtual-model-2');

  expect(born.x).toBe(lowest.x);
  expect(born.y).toBeGreaterThan(lowest.y);
});

test('a card born into a column lands exactly where tidying it in would have seated it', () => {
  const placed = tidyPositions(canvasOf(['gateway', 'virtual-model']));
  const grown = tidyPositions(canvasOf(['gateway', 'virtual-model', 'virtual-model']));

  expect(seatForNewNode('virtual-model', placed)).toEqual(seatAt(grown, 'virtual-model-2'));
});

test('a new card is born at the top of a column holding nothing yet', () => {
  const placed = tidyPositions(canvasOf(['gateway']));

  expect(seatForNewNode('virtual-model', placed)).toEqual({ x: columnStep(), y: 0 });
});

test('a new card reads only its own column, so cards standing elsewhere never push it down', () => {
  const placed = tidyPositions(canvasOf(['gateway', 'virtual-model', 'virtual-model']));

  expect(seatForNewNode('target', placed)).toEqual({ x: columnStep() * 2, y: 0 });
});

test('a card born below one a person dragged low follows the drag rather than the tidy seat', () => {
  const dragged = { 'virtual-model-0': { x: columnStep(), y: 900 } };

  expect(seatForNewNode('virtual-model', dragged).y).toBeGreaterThan(900);
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
