import type {
  Account,
  GatewayConfig,
  GatewayTraffic,
  RequestOutcome,
  VirtualModel,
} from '@recompose/contracts';

import type { XY } from './canvas-positions';

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
  | { id: string; kind: 'target'; account: Account }
  | { id: string; kind: 'ghost-target'; accountId: string }
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

function targetNode(model: VirtualModel, accounts: readonly Account[]): CanvasNode {
  const { accountId } = model.target;
  const account = accounts.find((held) => held.id === accountId);

  return account === undefined
    ? { id: `ghost:${accountId}`, kind: 'ghost-target', accountId }
    : { id: `target:${account.id}`, kind: 'target', account };
}

type CarriedTraffic = Readonly<Record<string, RequestOutcome>>;

function carriedBy(gateway: GatewayConfig, traffic: GatewayTraffic): CarriedTraffic {
  return traffic[gateway.slug] ?? {};
}

function standingCarried(carried: RequestOutcome | undefined): CableStanding | undefined {
  if (carried === undefined) {
    return undefined;
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
  const seated = new Set<string>();

  for (const model of gateway.virtualModels) {
    const target = targetNode(model, accounts);
    const flowed = target.kind === 'target' ? carried[model.id] : undefined;

    nodes.push({
      id: modelNodeId(model.id),
      kind: 'virtual-model',
      modelId: model.id,
      displayName: model.displayName,
      providerModel: model.target.providerModel,
    });

    if (!seated.has(target.id)) {
      seated.add(target.id);
      nodes.push(target);
    }

    edges.push(structuralWire(modelNodeId(model.id), flowed), bindingCable(model, target, flowed));
  }

  return { nodes, edges };
}

function draftAppending(
  gateway: GatewayConfig,
  draft: DraftStanding | undefined,
): DraftStanding | undefined {
  if (draft === undefined) {
    return undefined;
  }

  return gateway.virtualModels.some((model) => model.id === draft.modelId) ? undefined : draft;
}

/**
 * Every card and cable the canvas stands on, read off the gateway, the registry, and the overlay.
 *
 * @summary This is the only thing that writes graph shape, so what a person sees is the stored
 * composition rather than a second copy of it drifting beside one. A binding whose account left the
 * registry keeps its cable onto a ghost card, because a broken binding is what a person came back
 * to repair and a blank space says nothing about it. The gateway wires to every virtual model and
 * draft it serves, so the template's spine reads on the canvas; a wire is structural, which no
 * gesture selects, reconnects, or deletes. The overlay cards append last and a draft naming a
 * model the gateway already serves stands down, so nothing the renderer holds can shadow a stored
 * binding. The overlay cables carry their own `overlay:` namespace and every wire carries the node
 * id it reaches, because a person may legally alias a virtual model `draft`, and two cables under
 * one id would let a press, a reconnect, or a delete land on the wrong one.
 *
 * Traffic paints both cables of the virtual model it flowed through, and a virtual model nothing
 * has flowed through yet stays at rest, so a cable reading served says a request truly came back.
 * A binding whose account left the registry keeps reading broken whatever last flowed through it,
 * because it cannot serve the next request and stale green would say it could. Only the binding
 * cable carries the failure a person reads, so one failed request stands one error to press
 * rather than repeating itself along the wire.
 */
export function canvasGraph(
  gateway: GatewayConfig,
  accounts: readonly Account[],
  overlay: CanvasOverlay,
  traffic: GatewayTraffic = {},
): CanvasGraph {
  const { nodes, edges } = servedGraph(gateway, accounts, carriedBy(gateway, traffic));
  const drafting = draftAppending(gateway, overlay.draft);

  if (drafting !== undefined) {
    nodes.push({
      id: DRAFT_NODE_ID,
      kind: 'draft-model',
      modelId: drafting.modelId,
      displayName: drafting.displayName,
    });
    edges.push(structuralWire(DRAFT_NODE_ID, undefined), {
      id: 'overlay:draft',
      source: GATEWAY_NODE_ID,
      target: DRAFT_NODE_ID,
      standing: 'draft',
      failure: undefined,
    });
  }

  if (overlay.pending !== undefined) {
    const { from } = overlay.pending;

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

  return { nodes, edges };
}
