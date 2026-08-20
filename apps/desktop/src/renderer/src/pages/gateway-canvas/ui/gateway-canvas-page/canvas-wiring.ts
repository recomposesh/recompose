import type { GatewayConfig } from '@recompose/contracts';
import type { Edge, Node, NodeChange } from '@xyflow/react';

import { targetTheEntryNames } from '@recompose/contracts';

import type { NodePositions, XY } from '../../lib/canvas-positions';
import type { CanvasEdge, CanvasGraph, CanvasNode } from '../../lib/node-graph';
import type { RouteAddress } from '../../lib/route-addresses';

import { CABLE_GRAB_SPAN } from '../../lib/cable-standing';
import { addressUnder, routeNodeIn } from '../../lib/route-addresses';
import {
  CARD_MEASURE,
  columnBeyond,
  SATELLITE_MEASURE,
  seatBesideAsker,
  seatForNewNode,
} from '../../lib/tidy-layout';

/** The two asks a card can hang off its port, which the page answers. */
export type CanvasAsks = {
  /** Receives the gateway plus, which births the draft virtual model. */
  onAddVirtualModel: () => void;
  /** Receives a model, draft, or router plus, which opens the binding ask for that card. */
  onBindFrom: (from: string) => void;
};

/** One seat a position change moved, and whether the drag settled there. */
export type MovedSeat = { id: string; to: XY; settled: boolean };

/**
 * Where a card bound from another one stands, which is the asking card's row one column beyond.
 *
 * @summary A request travels left to right, so what a card binds stands beyond it however the
 * binding was asked for: a plus, a cable let go on open canvas, and a cable let go on a stored
 * target all grow the composition the same direction. The column counts out of the asking card's
 * own depth rather than off the binding column, because a child of a router two deep would
 * otherwise land back beside the virtual model with its cable running the wrong way. The row is
 * the asker's own, so the cable between the two runs flat rather than bending across a row to
 * reach a card standing beside it. A card whose seat nobody knows falls back to the free row,
 * since a row that cannot be read cannot be shared.
 */
export function seatBeyond(nodes: readonly CanvasNode[], seats: NodePositions, from: string): XY {
  const column = columnBeyond(nodes.find((node) => node.id === from));
  const asker = seats[from];

  return asker === undefined
    ? seatForNewNode(column, seats)
    : seatBesideAsker(column, asker, seats);
}

/** The definition id inside a model card's node id, or nothing for any other card. */
export function modelIdOf(nodeId: string): string | undefined {
  return nodeId.startsWith('model:') ? nodeId.slice('model:'.length) : undefined;
}

/** The binding's model id inside a target or ghost card's node id, or nothing otherwise. */
export function targetModelIdOf(nodeId: string): string | undefined {
  return addressUnder(['target:', 'ghost:'], nodeId)?.modelId;
}

/** The account one definition answers through today, or nothing where it answers through none. */
export function accountBoundTo(
  gateway: GatewayConfig,
  modelId: string | undefined,
): string | undefined {
  const held = gateway.virtualModels.find((model) => model.id === modelId);

  return held === undefined ? undefined : targetTheEntryNames(held.routing)?.accountId;
}

/**
 * The account behind a target or ghost card, read through the route node the card stands at.
 *
 * @summary A ladder stands several target cards for one definition, so the account comes from the
 * card's own route node rather than from whatever the definition tries first: reading them all
 * through the entry would paint every card of a pool as the first account it holds.
 */
export function targetAccountIdIn(gateway: GatewayConfig, nodeId: string): string | undefined {
  const node = routeNodeIn(gateway, addressUnder(['target:', 'ghost:'], nodeId));

  return node?.kind === 'target' ? node.accountId : undefined;
}

/** The definition id inside a binding cable's id, or nothing for an overlay cable. */
export function bindingCableId(edgeId: string): string | undefined {
  return addressUnder(['cable:'], edgeId)?.modelId;
}

/**
 * Where a binding cable's far end lands, or nothing for an overlay cable.
 *
 * @summary A ladder stands one cable per child, so a reader acting on the cable a person selected
 * needs the address that cable ends at rather than the definition holding it: the definition alone
 * names the entry, and acting on the entry when a child was selected takes every sibling with it.
 */
export function cableAddressOf(edgeId: string): RouteAddress | undefined {
  return addressUnder(['cable:'], edgeId);
}

/** Where a router card stands in its definition's routing, or nothing for any other card. */
export function routerAddressOf(nodeId: string): RouteAddress | undefined {
  return addressUnder(['route:'], nodeId);
}

/** Where any card standing for a route node stands, whichever of the three prefixes it wears. */
export function cardAddressOf(nodeId: string): RouteAddress | undefined {
  return addressUnder(['target:', 'ghost:', 'route:'], nodeId);
}

/**
 * The seats the library asked to move, read out of a change batch.
 *
 * @summary The flow runs controlled and this is its one write path: position changes move seats,
 * and every foreign change type falls on the floor, so the library's store can never grow into a
 * second writer of topology. A change settles once the drag lets go, which is when the
 * arrangement is worth writing down.
 */
export function movedSeats(changes: readonly NodeChange[]): readonly MovedSeat[] {
  const moves: MovedSeat[] = [];

  for (const change of changes) {
    if (change.type === 'position' && change.position !== undefined) {
      moves.push({ id: change.id, to: change.position, settled: change.dragging !== true });
    }
  }

  return moves;
}

/**
 * The landing question one card answers about the cable in flight, or nothing where it takes none.
 *
 * @summary Only a card a cable can actually land on carries it, so the card itself needs no rule
 * and no gateway to know whether to light: a card that answers nothing is a card that never lights.
 */
function landingAsk(
  node: CanvasNode,
  takesCable: (from: string, onto: string) => boolean,
): Record<string, unknown> {
  if (node.kind !== 'target' && node.kind !== 'ghost-target') {
    return {};
  }

  return { takesCableFrom: (from: string) => takesCable(from, node.id) };
}

function askedData(
  node: CanvasNode,
  asks: CanvasAsks,
  takesCable: (from: string, onto: string) => boolean,
): Record<string, unknown> {
  if (node.kind === 'gateway') {
    return { ...node, onAddVirtualModel: asks.onAddVirtualModel };
  }

  if (node.kind === 'router') {
    return {
      ...node,
      onAddChild: () => {
        asks.onBindFrom(node.id);
      },
    };
  }

  if (node.kind === 'virtual-model' || node.kind === 'draft-model') {
    return {
      ...node,
      onPickTarget: () => {
        asks.onBindFrom(node.id);
      },
    };
  }

  return { ...node, ...landingAsk(node, takesCable) };
}

/**
 * The node objects the flow renders, derived afresh from the graph every time.
 *
 * @summary Each node declares the card's own measure, so edges draw on first paint instead of
 * waiting for a layout pass, and each carries its ask beside its facts, because the card is where
 * the plus lives and the page is what answers it. A card a cable could land on carries the landing
 * question too, so a drag in flight lights every card that would take it rather than only the one
 * a pointer already found.
 */
export function flowNodesOf(
  graph: CanvasGraph,
  seats: NodePositions,
  selection: string | undefined,
  asks: CanvasAsks,
  takesCable: (from: string, onto: string) => boolean,
): Node[] {
  return graph.nodes.map((node) => ({
    id: node.id,
    type: node.kind,
    position: seats[node.id] ?? { x: 0, y: 0 },
    data: askedData(node, asks, takesCable),
    selected: node.id === selection,
    draggable: true,
    ...(node.kind === 'judge' ? SATELLITE_MEASURE : CARD_MEASURE),
  }));
}

/**
 * The edge objects the flow renders, one binding cable each plus the wires and the overlay pair.
 *
 * @summary Only a binding cable answers anything: it keeps the wide grab band its reconnect drag
 * is sized by, and the keyboard can stop on it to read and release the binding. A wire and an
 * overlay cable answer no pointer and no keyboard at all, because they stand for the frame and
 * for work in flight rather than for stored bindings: with a band of their own they would swallow
 * every pane press along their corridor, and as tab stops they would stand one inert stop per
 * model.
 */
export function flowEdgesOf(edges: readonly CanvasEdge[], selection: string | undefined): Edge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'cable',
    sourceHandle: edge.sourceHandle ?? null,
    data: {
      standing: edge.standing,
      failure: edge.failure,
      branch: edge.branch,
      wording: edge.wording,
    },
    selected: edge.id === selection,
    ...(bindingCableId(edge.id) === undefined
      ? { selectable: false, reconnectable: false, focusable: false, interactionWidth: 0 }
      : { interactionWidth: CABLE_GRAB_SPAN }),
  }));
}

/**
 * Whether the keyboard currently belongs to a text field.
 *
 * @summary While a person edits text, Backspace and Delete edit text, and the canvas has no claim
 * on them: a keystroke meant for a name must never take a node or a cable with it.
 */
export function editingText(active: Element | null): boolean {
  return (
    active instanceof HTMLInputElement ||
    active instanceof HTMLTextAreaElement ||
    (active instanceof HTMLElement && active.isContentEditable)
  );
}
