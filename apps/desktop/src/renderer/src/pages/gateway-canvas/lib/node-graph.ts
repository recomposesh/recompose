import type {
  Account,
  GatewayConfig,
  GatewayTraffic,
  RequestOutcome,
  SubscriptionAccountView,
  VirtualModel,
} from '@recompose/contracts';

import type { CarriedTraffic } from './cable-traffic';
import type { CanvasEdge } from './canvas-cables';
import type { CanvasNode, PlacedRouteNode, Registry } from './canvas-cards';
import type { XY } from './canvas-positions';

import { carriedBy, latestAcrossNodes, outcomesThroughRouters } from './cable-traffic';
import {
  cableInto,
  GATEWAY_NODE_ID,
  modelNodeId,
  outcomeInto,
  structuralWire,
} from './canvas-cables';
import { routeCard } from './canvas-cards';
import { addressName } from './route-addresses';
import { firstDeclaredTarget, walkedRouteNodes } from './route-graph';

export type { CableFailure, CableStanding } from './cable-traffic';
export type { CanvasEdge } from './canvas-cables';
export type { CanvasNode, CanvasNodeKind } from './canvas-cards';

export const DRAFT_NODE_ID = 'draft';

const PENDING_NODE_ID = 'pending';

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

type RoutedCards = { nodes: CanvasNode[]; edges: CanvasEdge[]; flowed: RequestOutcome | undefined };

type SeatedCard = { placed: PlacedRouteNode; card: CanvasNode };

function seatedCards(model: VirtualModel, registry: Registry): readonly SeatedCard[] {
  const { entry } = model.routing;

  return walkedRouteNodes(model.routing).map((walked) => {
    const placed = {
      modelId: model.id,
      name: addressName(model.id, walked.routeNodeId, entry),
      walked,
    };

    return { placed, card: routeCard(placed, registry) };
  });
}

function paintedOnto(
  seated: readonly SeatedCard[],
  carried: CarriedTraffic,
): Record<string, RequestOutcome> {
  const painted: Record<string, RequestOutcome> = {};

  for (const { placed, card } of seated) {
    const into = outcomeInto(carried, card, placed);

    if (into !== undefined) {
      painted[placed.walked.routeNodeId] = into;
    }
  }

  return painted;
}

function outcomeOnto(
  placed: PlacedRouteNode,
  painted: Readonly<Record<string, RequestOutcome>>,
  throughRouters: Readonly<Record<string, RequestOutcome | undefined>>,
): RequestOutcome | undefined {
  return placed.walked.node.kind === 'router'
    ? throughRouters[placed.walked.routeNodeId]
    : painted[placed.walked.routeNodeId];
}

function routedCards(
  model: VirtualModel,
  registry: Registry,
  carried: CarriedTraffic,
): RoutedCards {
  const seated = seatedCards(model, registry);
  const painted = paintedOnto(seated, carried);
  const throughRouters = outcomesThroughRouters(
    seated.map((held) => held.placed.walked),
    painted,
  );
  const edges = seated.map(({ placed, card }) =>
    cableInto(placed, card, outcomeOnto(placed, painted, throughRouters), model.routing.entry),
  );

  return {
    nodes: seated.map((held) => held.card),
    edges,
    flowed: latestAcrossNodes(painted),
  };
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
 * Traffic paints the wire and the cable of the virtual model it flowed through, and every router
 * cable between the gateway and the child that answered borrows the newest reading below it, so the
 * path a request walked lights whole rather than resting across the middle. A virtual model nothing
 * has flowed through yet stays at rest, so a cable reading served says a request truly came back. A
 * binding whose account left the registry keeps reading broken whatever last flowed through it,
 * because it cannot serve the next request and stale green would say it could. Only the cable onto
 * the child that failed carries the failure a person reads, so one failed request stands one error
 * to press rather than repeating itself along the wire.
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
