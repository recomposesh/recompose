import type {
  Account,
  GatewayConfig,
  GatewayTraffic,
  RequestOutcome,
  SubscriptionAccountView,
  VirtualModel,
} from '@recompose/contracts';

import type { CableFailure, CableStanding, CarriedTraffic } from './cable-traffic';
import type { CanvasNode, PlacedRouteNode, Registry } from './canvas-cards';
import type { XY } from './canvas-positions';

import { carriedBy, failureCarried, latestAcrossNodes, standingCarried } from './cable-traffic';
import { routeCard } from './canvas-cards';
import { addressName } from './route-addresses';
import { firstDeclaredTarget, walkedRouteNodes } from './route-graph';

export type { CableFailure, CableStanding } from './cable-traffic';
export type { CanvasNode, CanvasNodeKind } from './canvas-cards';

const GATEWAY_NODE_ID = 'gateway';

export const DRAFT_NODE_ID = 'draft';

const PENDING_NODE_ID = 'pending';

/** A cable drawn between two cards standing on the canvas. */
export type CanvasEdge = {
  id: string;
  source: string;
  target: string;
  standing: CableStanding;
  failure: CableFailure | undefined;
};

/** A definition a person began and has not finished, holding the seat its card stands at. */
export type DraftStanding = { modelId: string; displayName: string; seat: XY };

/** A card holding the spot a cable was let go at, while the picker asks what belongs there. */
export type PendingStanding = { from: string; at: XY };

/** The two standings the renderer owns, which no stored gateway can carry. */
export type CanvasOverlay = {
  draft: DraftStanding | undefined;
  pending: PendingStanding | undefined;
};

/** Every card and cable the canvas draws, in the order they seat. */
export type CanvasGraph = { nodes: readonly CanvasNode[]; edges: readonly CanvasEdge[] };

function modelNodeId(modelId: string): string {
  return `model:${modelId}`;
}

/**
 * What the last request through one route node says about the cable feeding its card.
 *
 * @summary Traffic names the route node an attempt went through, so each cable of a ladder paints
 * from its own node: the child a router moved on from reads failed beside the child that answered,
 * where one reading spread over every cable would say both failed. A router is attempted by nothing,
 * so the cable into one rests and the children below it carry the story. A cable onto a card whose
 * account left the registry carries nothing at all, because it cannot serve the next request and
 * stale green would say it could.
 */
function outcomeInto(
  carried: CarriedTraffic,
  card: CanvasNode,
  placed: PlacedRouteNode,
): RequestOutcome | undefined {
  if (card.kind === 'ghost-target') {
    return undefined;
  }

  return carried[placed.modelId]?.[placed.walked.routeNodeId];
}

function cableInto(
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
    failure: failureCarried(carried),
  };
}

function structuralWire(servedNodeId: string, carried: RequestOutcome | undefined): CanvasEdge {
  return {
    id: `wire:${servedNodeId}`,
    source: GATEWAY_NODE_ID,
    target: servedNodeId,
    standing: standingCarried(carried) ?? 'structural',
    failure: undefined,
  };
}

type RoutedCards = { nodes: CanvasNode[]; edges: CanvasEdge[]; flowed: RequestOutcome | undefined };

function routedCards(
  model: VirtualModel,
  registry: Registry,
  carried: CarriedTraffic,
): RoutedCards {
  const { entry } = model.routing;
  const nodes: CanvasNode[] = [];
  const edges: CanvasEdge[] = [];
  const painted: Record<string, RequestOutcome> = {};

  for (const walked of walkedRouteNodes(model.routing)) {
    const placed = {
      modelId: model.id,
      name: addressName(model.id, walked.routeNodeId, entry),
      walked,
    };
    const card = routeCard(placed, registry);
    const into = outcomeInto(carried, card, placed);

    if (into !== undefined) {
      painted[walked.routeNodeId] = into;
    }

    nodes.push(card);
    edges.push(cableInto(placed, card, into, entry));
  }

  return { nodes, edges, flowed: latestAcrossNodes(painted) };
}

function modelCard(model: VirtualModel): CanvasNode {
  return {
    id: modelNodeId(model.id),
    kind: 'virtual-model',
    modelId: model.id,
    displayName: model.displayName,
    providerModel: firstDeclaredTarget(model.routing)?.providerModel ?? '',
  };
}

function servedGraph(
  gateway: GatewayConfig,
  registry: Registry,
  carried: CarriedTraffic,
): { nodes: CanvasNode[]; edges: CanvasEdge[] } {
  const nodes: CanvasNode[] = [
    {
      id: GATEWAY_NODE_ID,
      kind: 'gateway',
      displayName: gateway.displayName,
      port: gateway.port,
    },
  ];
  const edges: CanvasEdge[] = [];

  for (const model of gateway.virtualModels) {
    const routed = routedCards(model, registry, carried);

    nodes.push(modelCard(model), ...routed.nodes);
    edges.push(structuralWire(modelNodeId(model.id), routed.flowed), ...routed.edges);
  }

  return { nodes, edges };
}

/**
 * Every card and cable the canvas stands on, read off the gateway, the registry, and the overlay.
 *
 * @summary This is the only thing that writes graph shape, so what a person sees is the stored
 * composition rather than a second copy of it drifting beside one. A virtual model stands every
 * route node its table holds, so a router stands its own card between the model and the targets
 * under it, and each child hangs off the router by a cable of its own. A binding whose account left
 * the registry keeps its cable onto a ghost card, because a broken binding is what a person came
 * back to repair and a blank space says nothing about it. The gateway wires to every virtual model
 * and draft it serves, so the template's spine reads on the canvas; a wire is structural, which no
 * gesture selects, reconnects, or deletes. The overlay card keeps its own `draft` identity while
 * the person edits the client-facing model id, so temporarily matching a stored id never makes the
 * draft disappear.
 *
 * Traffic paints the wire and the cable of the virtual model it flowed through, and a virtual model
 * nothing has flowed through yet stays at rest, so a cable reading served says a request truly came
 * back. A binding whose account left the registry keeps reading broken whatever last flowed through
 * it, because it cannot serve the next request and stale green would say it could. Only the cable
 * out of the model carries the failure a person reads, so one failed request stands one error to
 * press rather than repeating itself along the wire.
 */
export function canvasGraph(
  gateway: GatewayConfig,
  accounts: readonly Account[],
  overlay: CanvasOverlay,
  traffic: GatewayTraffic = {},
  subscriptions: readonly SubscriptionAccountView[] = [],
  now: number = Date.now(),
): CanvasGraph {
  const { nodes, edges } = servedGraph(
    gateway,
    { accounts, subscriptions },
    carriedBy(gateway, traffic, now),
  );

  appendDraftCard(nodes, edges, overlay.draft);
  appendPendingCard(nodes, edges, overlay.pending);

  return { nodes, edges };
}

function appendDraftCard(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  drafting: DraftStanding | undefined,
): void {
  if (drafting === undefined) {
    return;
  }

  nodes.push({
    id: DRAFT_NODE_ID,
    kind: 'draft-model',
    modelId: drafting.modelId,
    displayName: drafting.displayName,
  });
  edges.push(structuralWire(DRAFT_NODE_ID, undefined));
}

function appendPendingCard(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  pending: PendingStanding | undefined,
): void {
  if (pending === undefined) {
    return;
  }

  const { from } = pending;

  nodes.push({ id: PENDING_NODE_ID, kind: 'pending-target' });

  if (nodes.some((node) => node.id === from)) {
    edges.push({
      id: 'overlay:pending',
      source: from,
      target: PENDING_NODE_ID,
      standing: 'pending',
      failure: undefined,
    });
  }
}
