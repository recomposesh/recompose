import type { RequestOutcome } from '@recompose/contracts';

import type { CableFailure, CableStanding, CarriedTraffic } from './cable-traffic';
import type { CanvasNode, PlacedRouteNode } from './canvas-cards';
import type { BranchSeat } from './route-graph';

import { failureCarried, standingCarried } from './cable-traffic';

/** The card the gateway itself stands as, which every structural wire leaves from. */
export const GATEWAY_NODE_ID = 'gateway';

/** The port a router hangs its judge from, which is the shoulder rather than the child port. */
export const JUDGE_SHOULDER_PORT = 'judge';

/** Which branch a press on this cable's pill would open for wording. */
export type CableWording = {
  modelId: string;
  routerId: string;
  child: string;
  routesTo: string;
};

/** A cable drawn between two cards standing on the canvas. */
export type CanvasEdge = {
  id: string;
  source: string;
  target: string;
  standing: CableStanding;
  failure: CableFailure | undefined;
  branch?: BranchSeat | undefined;
  wording?: CableWording | undefined;
  sourceHandle?: string | undefined;
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
function cameFrom(placed: PlacedRouteNode): string {
  const { parentName } = placed;

  return parentName === undefined ? modelNodeId(placed.modelId) : `route:${parentName}`;
}

/**
 * Which branch a press on this cable's pill words, or nothing where the cable draws no branch.
 *
 * @summary The cable carries the three ids a write needs, because the press happens on the drawn
 * line and the surface that draws it knows nothing about route tables. The else branch is left out:
 * nobody wrote it and nobody may, since it catches whatever the other branches did not.
 */
function cardNamed(card: CanvasNode): string {
  if (card.kind === 'target') {
    return card.providerModel;
  }

  return card.kind === 'ghost-target' ? card.accountId : card.id;
}

function wordingOn(placed: PlacedRouteNode, card: CanvasNode): CableWording | undefined {
  const { branch, parent, routeNodeId } = placed.walked;

  if (branch === undefined || branch.kind === 'else' || parent === undefined) {
    return undefined;
  }

  return {
    modelId: placed.modelId,
    routerId: parent,
    child: routeNodeId,
    routesTo: cardNamed(card),
  };
}

export function cableInto(
  placed: PlacedRouteNode,
  card: CanvasNode,
  carried: RequestOutcome | undefined,
): CanvasEdge {
  const unserved: CableStanding = card.kind === 'ghost-target' ? 'broken' : 'resting';

  return {
    id: `cable:${placed.name}`,
    source: cameFrom(placed),
    target: card.id,
    standing: standingCarried(carried) ?? unserved,
    failure: placed.walked.node.kind === 'router' ? undefined : failureCarried(carried),
    branch: placed.walked.branch,
    wording: wordingOn(placed, card),
  };
}

/**
 * The dotted tie between a router and the judge advising it, drawn instead of a binding cable.
 *
 * @summary A judge answers no request, so it hangs off the router's shoulder rather than off the
 * port every child leaves by: a cable running with the children would say a request travels here,
 * and a person thinning the pool would count one target too many.
 */
export function tieOnto(
  placed: PlacedRouteNode,
  card: CanvasNode,
  carried: RequestOutcome | undefined,
): CanvasEdge {
  return {
    id: `tie:${placed.name}`,
    source: cameFrom(placed),
    sourceHandle: JUDGE_SHOULDER_PORT,
    target: card.id,
    standing: standingCarried(carried) ?? 'resting',
    failure: undefined,
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
