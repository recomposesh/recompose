import type { Account } from '@recompose/contracts';

import { fc } from '@fast-check/vitest';

import type { NodePositions, XY } from './canvas-positions';
import type { CanvasNode, CanvasNodeKind } from './node-graph';

import { tidyPositions } from './tidy-layout';

/** The one account every seating scenario stands its target cards on. */
export const work: Account = {
  id: 'a1',
  provider: 'anthropic',
  kind: 'subscription',
  provenance: 'sign-in',
  label: 'Work',
};

/** One card of each kind the canvas stands, so a scenario names a canvas by the kinds on it. */
export const nodeOfKind: Record<CanvasNodeKind, (id: string) => CanvasNode> = {
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
    providerModel: 'claude-sonnet-5',
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
  judge: (id) => ({
    id,
    kind: 'judge',
    modelId: 'fast',
    routeNodeId: id,
    depth: 0,
    advises: 'route:fast',
    accountId: 'a1',
    providerModel: 'claude-haiku-5',
  }),
  'draft-model': (id) => ({ id, kind: 'draft-model', modelId: '', displayName: '' }),
  'pending-target': (id) => ({ id, kind: 'pending-target' }),
};

/** Which column each kind of card belongs in, which the seating laws read against. */
export const columnRank: Record<CanvasNodeKind, number> = {
  gateway: 0,
  'virtual-model': 1,
  'draft-model': 1,
  target: 2,
  'ghost-target': 2,
  router: 2,
  judge: 2,
  'pending-target': 2,
};

/** Any canvas a person could compose out of the kinds that take a column of their own. */
export const anyCanvas = fc.array(
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

/** Where one card seats, refusing a canvas that seated nothing under that id. */
export function seatAt(seats: NodePositions, id: string): XY {
  const seat = seats[id];

  if (seat === undefined) {
    throw new Error(`the arrangement seats nothing under "${id}"`);
  }

  return seat;
}

/** A canvas standing one card per kind named, each under an id naming its rank. */
export function canvasOf(kinds: readonly CanvasNodeKind[]): readonly CanvasNode[] {
  return kinds.map((kind, index) => nodeOfKind[kind](`${kind}-${String(index)}`));
}

/** The pitch between two columns, measured off the arrangement rather than spelled out. */
export function columnStep(): number {
  const seats = tidyPositions(canvasOf(['gateway', 'virtual-model']));

  return seatAt(seats, 'virtual-model-1').x - seatAt(seats, 'gateway-0').x;
}

/** A target card standing however many routers below the entry a scenario names. */
export function oneRouterDeep(id: string, depth: number): CanvasNode {
  return {
    id,
    kind: 'target',
    account: work,
    modelId: 'fast',
    providerModel: 'claude-sonnet-5',
    routeNodeId: id,
    depth,
  };
}
