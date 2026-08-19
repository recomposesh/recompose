import type { RequestOutcome } from '@recompose/contracts';

import type { CableFailure, CableStanding, CarriedTraffic } from './cable-traffic';
import type { CanvasNode, PlacedRouteNode } from './canvas-cards';
import type { BranchSeat } from './route-graph';

import { failureCarried, standingCarried } from './cable-traffic';
import { addressName } from './route-addresses';

/** The card the gateway itself stands as, which every structural wire leaves from. */
export const GATEWAY_NODE_ID = 'gateway';

/** A cable drawn between two cards standing on the canvas. */
export type CanvasEdge = {
  id: string;
  source: string;
  target: string;
  standing: CableStanding;
  failure: CableFailure | undefined;
  branch?: BranchSeat | undefined;
};

/** What names one virtual model's card apart from every other card on the canvas. */
export function modelNodeId(modelId: string): string {
  return `model:${modelId}`;
}

/**
 * What the last request through one route node says about the cable feeding its card.
 *
 * @summary Traffic names the route node an attempt went through, so each cable of a ladder paints
 * from its own node: the child a router moved on from reads failed beside the child that answered,
 * where one reading spread over every cable would say both failed. A cable onto a card whose
 * account left the registry carries nothing at all, because it cannot serve the next request and
 * stale green would say it could.
 */
export function outcomeInto(
  carried: CarriedTraffic,
  card: CanvasNode,
  placed: PlacedRouteNode,
): RequestOutcome | undefined {
  if (card.kind === 'ghost-target') {
    return undefined;
  }

  return carried[placed.modelId]?.[placed.walked.routeNodeId];
}

/**
 * The cable arriving at one card, painted by whatever last flowed through the node it stands for.
 *
 * @summary The cable carries the branch its parent reaches this card by, so the rule a judge reads
 * rides the very line the request travels rather than hiding in a panel. A router's own cable
 * carries no failure, because a router is attempted by nothing and the error belongs on the child
 * that answered with it.
 */
export function cableInto(
  placed: PlacedRouteNode,
  card: CanvasNode,
  carried: RequestOutcome | undefined,
  entry: string,
): CanvasEdge {
  const { modelId, walked } = placed;
  const unserved: CableStanding = card.kind === 'ghost-target' ? 'broken' : 'resting';

  return {
    id: `cable:${placed.name}`,
    source:
      walked.parent === undefined
        ? modelNodeId(modelId)
        : `route:${addressName(modelId, walked.parent, entry)}`,
    target: card.id,
    standing: standingCarried(carried) ?? unserved,
    failure: walked.node.kind === 'router' ? undefined : failureCarried(carried),
    branch: walked.branch,
  };
}

/** The gateway's own wire onto a card it serves, which stands for the frame rather than a binding. */
export function structuralWire(
  servedNodeId: string,
  carried: RequestOutcome | undefined,
): CanvasEdge {
  return {
    id: `wire:${servedNodeId}`,
    source: GATEWAY_NODE_ID,
    target: servedNodeId,
    standing: standingCarried(carried) ?? 'structural',
    failure: undefined,
  };
}
