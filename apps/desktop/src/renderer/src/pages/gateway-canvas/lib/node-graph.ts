import type {
  Account,
  GatewayConfig,
  GatewayTraffic,
  RequestOutcome,
  SubscriptionAccountView,
  VirtualModel,
} from '@recompose/contracts';

import type { XY } from './canvas-positions';

import { accountDetail } from '../../../entities/account';

const GATEWAY_NODE_ID = 'gateway';
const DRAFT_NODE_ID = 'draft';
const PENDING_NODE_ID = 'pending';

/** A card standing on the canvas, which is either engine truth or one of the two overlay cards. */
export type CanvasNode =
  | { id: string; kind: 'gateway'; displayName: string; port: number }
  | {
      id: string;
      kind: 'virtual-model';
      modelId: string;
      displayName: string;
      providerModel: string;
    }
  | { id: string; kind: 'target'; account: Account; modelId: string; detail?: string }
  | { id: string; kind: 'ghost-target'; accountId: string; modelId: string }
  | { id: string; kind: 'draft-model'; modelId: string; displayName: string }
  | { id: string; kind: 'pending-target' };

/** Which card a node stands as, which is what decides the column it seats in. */
export type CanvasNodeKind = CanvasNode['kind'];

/** How a cable reads: a stored binding at rest or carrying traffic, one whose account left, one of the two the overlay draws, or the gateway's own wire to a card it serves. */
export type CableStanding =
  | 'resting'
  | 'live'
  | 'served'
  | 'failed'
  | 'broken'
  | 'draft'
  | 'pending'
  | 'structural';

/** What a request the gateway refused or could not finish came to, as a person reads it. */
export type CableFailure = { status: number; detail: string };

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

function targetNode(
  model: VirtualModel,
  accounts: readonly Account[],
  subscriptions: readonly SubscriptionAccountView[],
): CanvasNode {
  const { accountId } = model.target;
  const account = accounts.find((held) => held.id === accountId);

  if (account === undefined) {
    return { id: `ghost:${model.id}`, kind: 'ghost-target', accountId, modelId: model.id };
  }

  const signedInAs =
    account.kind === 'subscription'
      ? subscriptions.find((view) => view.id === account.id)?.signedInAs
      : undefined;

  return {
    id: `target:${model.id}`,
    kind: 'target',
    account,
    modelId: model.id,
    detail: accountDetail(account, signedInAs),
  };
}

type CarriedTraffic = Readonly<Record<string, RequestOutcome>>;

const CABLE_TRAFFIC_MEMORY_MS = 60_000;

/**
 * Whether a carried outcome still deserves its tint: a live request always, a served one for a
 * minute, and a failure until newer traffic answers it, because a break needs a person to see it.
 */
function stillWarm(carried: RequestOutcome, now: number): boolean {
  if (carried.outcome === 'served') {
    return now - carried.at <= CABLE_TRAFFIC_MEMORY_MS;
  }

  return true;
}

function carriedBy(gateway: GatewayConfig, traffic: GatewayTraffic, now: number): CarriedTraffic {
  const flowed = traffic[gateway.slug] ?? {};

  return Object.fromEntries(
    Object.entries(flowed).filter(([, carried]) => stillWarm(carried, now)),
  );
}

function standingCarried(carried: RequestOutcome | undefined): CableStanding | undefined {
  if (carried === undefined) {
    return undefined;
  }

  if (carried.outcome === 'live') {
    return 'live';
  }

  return carried.outcome === 'served' ? 'served' : 'failed';
}

function failureCarried(carried: RequestOutcome | undefined): CableFailure | undefined {
  return carried?.outcome === 'failed'
    ? { status: carried.status, detail: carried.detail }
    : undefined;
}

function bindingCable(
  model: VirtualModel,
  target: CanvasNode,
  carried: RequestOutcome | undefined,
): CanvasEdge {
  const unserved: CableStanding = target.kind === 'target' ? 'resting' : 'broken';

  return {
    id: `cable:${model.id}`,
    source: modelNodeId(model.id),
    target: target.id,
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

function servedGraph(
  gateway: GatewayConfig,
  accounts: readonly Account[],
  carried: CarriedTraffic,
  subscriptions: readonly SubscriptionAccountView[],
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
    const target = targetNode(model, accounts, subscriptions);
    const flowed = target.kind === 'target' ? carried[model.id] : undefined;

    nodes.push({
      id: modelNodeId(model.id),
      kind: 'virtual-model',
      modelId: model.id,
      displayName: model.displayName,
      providerModel: model.target.providerModel,
    });

    nodes.push(target);
    edges.push(structuralWire(modelNodeId(model.id), flowed), bindingCable(model, target, flowed));
  }

  return { nodes, edges };
}

/**
 * Every card and cable the canvas stands on, read off the gateway, the registry, and the overlay.
 *
 * @summary This is the only thing that writes graph shape, so what a person sees is the stored
 * composition rather than a second copy of it drifting beside one. A binding whose account left the
 * registry keeps its cable onto a ghost card, because a broken binding is what a person came back
 * to repair and a blank space says nothing about it. The gateway wires to every virtual model and
 * draft it serves, so the template's spine reads on the canvas; a wire is structural, which no
 * gesture selects, reconnects, or deletes. The overlay card keeps its own `draft` identity while
 * the person edits the client-facing model id, so temporarily matching a stored id never makes the
 * draft disappear. Every stored model and cable keeps its namespaced node id.
 *
 * Traffic paints both cables of the virtual model it flowed through, and a virtual model nothing
 * has flowed through yet stays at rest, so a cable reading served says a request truly came back.
 * A served reading cools back to rest once the minute passes it by, because a warm tint is a claim
 * about now rather than a plaque about ever; a failure stays until newer traffic answers it, since
 * a break is a thing a person has to see. A binding whose account left the registry keeps reading
 * broken whatever last flowed through it, because it cannot serve the next request and stale green
 * would say it could. Only the binding cable carries the failure a person reads, so one failed
 * request stands one error to press rather than repeating itself along the wire.
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
    accounts,
    carriedBy(gateway, traffic, now),
    subscriptions,
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
