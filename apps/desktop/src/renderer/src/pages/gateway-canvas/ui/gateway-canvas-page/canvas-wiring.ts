import type { GatewayConfig } from '@recompose/contracts';
import type { Connection, Edge, Node, NodeChange } from '@xyflow/react';

import type { NodePositions, XY } from '../../lib/canvas-positions';
import type { CanvasEdge, CanvasGraph, CanvasNode } from '../../lib/node-graph';
import type { InspectorSubject } from '../gateway-drawer/gateway-drawer';

import { CABLE_GRAB_SPAN } from '../../lib/cable-standing';

/** The two asks a card can hang off its port, which the page answers. */
export type CanvasAsks = {
  /** Receives the gateway plus, which births the draft virtual model. */
  onAddVirtualModel: () => void;
  /** Receives a model or draft plus, which opens the picker for that card. */
  onPickTargetFor: (from: string) => void;
};

/** One seat a position change moved, and whether the drag settled there. */
export type MovedSeat = { id: string; to: XY; settled: boolean };

export const CARD_MEASURE = { width: 184, height: 88 };

const DRAFT_CARD = 'draft';

/** The definition id inside a model card's node id, or nothing for any other card. */
export function modelIdOf(nodeId: string): string | undefined {
  return nodeId.startsWith('model:') ? nodeId.slice('model:'.length) : undefined;
}

/** The binding's model id inside a target or ghost card's node id, or nothing otherwise. */
export function targetModelIdOf(nodeId: string): string | undefined {
  if (nodeId.startsWith('target:')) {
    return nodeId.slice('target:'.length);
  }

  return nodeId.startsWith('ghost:') ? nodeId.slice('ghost:'.length) : undefined;
}

/** The account behind a target or ghost card, read through the binding the card stands for. */
export function targetAccountIdIn(gateway: GatewayConfig, nodeId: string): string | undefined {
  const modelId = targetModelIdOf(nodeId);

  return gateway.virtualModels.find((model) => model.id === modelId)?.target.accountId;
}

/** The definition id inside a binding cable's id, or nothing for an overlay cable. */
export function bindingCableId(edgeId: string): string | undefined {
  return edgeId.startsWith('cable:') ? edgeId.slice('cable:'.length) : undefined;
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
 * Whether a cable in flight may land where it points, which is the one-target rule during a drag.
 *
 * @summary A cable leaves a virtual model or a draft and lands on a stored target, and nothing
 * else connects. A model dropping onto the very account it already answers through refuses,
 * because a second cable to one target would say the rule out loud and then break it; any other
 * account is a rebind, which is one cable ending somewhere new.
 */
export function oneTargetRule(gateway: GatewayConfig) {
  return (connection: Edge | Connection): boolean => {
    const accountId = targetAccountIdIn(gateway, connection.target);

    if (accountId === undefined) {
      return false;
    }

    if (connection.source === 'draft') {
      return true;
    }

    const modelId = modelIdOf(connection.source);

    if (modelId === undefined) {
      return false;
    }

    const bound = gateway.virtualModels.find((model) => model.id === modelId);

    return bound === undefined || bound.target.accountId !== accountId;
  };
}

function askedData(node: CanvasNode, asks: CanvasAsks): Record<string, unknown> {
  if (node.kind === 'gateway') {
    return { ...node, onAddVirtualModel: asks.onAddVirtualModel };
  }

  if (node.kind === 'virtual-model' || node.kind === 'draft-model') {
    return {
      ...node,
      onPickTarget: () => {
        asks.onPickTargetFor(node.id);
      },
    };
  }

  return { ...node };
}

/**
 * The node objects the flow renders, derived afresh from the graph every time.
 *
 * @summary Each node declares the card's own measure, so edges draw on first paint instead of
 * waiting for a layout pass, and each carries its ask beside its facts, because the card is where
 * the plus lives and the page is what answers it.
 */
export function flowNodesOf(
  graph: CanvasGraph,
  seats: NodePositions,
  selection: string | undefined,
  asks: CanvasAsks,
): Node[] {
  return graph.nodes.map((node) => ({
    id: node.id,
    type: node.kind,
    position: seats[node.id] ?? { x: 0, y: 0 },
    data: askedData(node, asks),
    selected: node.id === selection,
    ...CARD_MEASURE,
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
    data: { standing: edge.standing, failure: edge.failure },
    selected: edge.id === selection,
    ...(bindingCableId(edge.id) === undefined
      ? { selectable: false, reconnectable: false, focusable: false, interactionWidth: 0 }
      : { interactionWidth: CABLE_GRAB_SPAN }),
  }));
}

function modelSubject(selection: string): InspectorSubject | undefined {
  const modelId = modelIdOf(selection);

  return modelId === undefined ? undefined : { kind: 'virtual-model', modelId };
}

function cableSubject(selection: string): InspectorSubject | undefined {
  const cableId = bindingCableId(selection);

  return cableId === undefined ? undefined : { kind: 'cable', modelId: cableId };
}

function targetSubject(gateway: GatewayConfig, selection: string): InspectorSubject | undefined {
  const boundModelId = targetModelIdOf(selection);
  const accountId = targetAccountIdIn(gateway, selection);

  if (boundModelId === undefined || accountId === undefined) {
    return undefined;
  }

  return selection.startsWith('ghost:')
    ? { kind: 'ghost-target', accountId, modelId: boundModelId }
    : { kind: 'target', accountId, modelId: boundModelId };
}

function prefixedSubject(gateway: GatewayConfig, selection: string): InspectorSubject | undefined {
  return modelSubject(selection) ?? cableSubject(selection) ?? targetSubject(gateway, selection);
}

/**
 * The subject the inspector speaks for, read off whatever stands selected.
 *
 * @summary Nothing selected reads as the gateway, because the gateway is what the whole screen is
 * about, and a selection with no body of its own falls back the same way rather than standing the
 * inspector in front of nothing. A target card names the binding it serves, so the account behind
 * it reads through the gateway rather than out of the card's id.
 */
export function subjectOf(gateway: GatewayConfig, selection: string | undefined): InspectorSubject {
  if (selection === undefined) {
    return { kind: 'gateway' };
  }

  if (selection === DRAFT_CARD) {
    return { kind: 'draft' };
  }

  return prefixedSubject(gateway, selection) ?? { kind: 'gateway' };
}

function modelCardOf(subject: InspectorSubject): string | undefined {
  if (subject.kind === 'virtual-model') {
    return `model:${subject.modelId}`;
  }

  return subject.kind === 'cable' ? `cable:${subject.modelId}` : undefined;
}

function targetCardOf(subject: InspectorSubject): string | undefined {
  if (subject.kind === 'target') {
    return `target:${subject.modelId}`;
  }

  return subject.kind === 'ghost-target' ? `ghost:${subject.modelId}` : undefined;
}

/**
 * The card a subject stands for, or nothing where the subject is the gateway itself.
 *
 * @summary The inverse of `subjectOf`, so a surface that speaks about a subject can move the one
 * canvas selection onto it without spelling a card id out for itself. The two live side by side on
 * purpose: a change to how a card is named has to move both, and the round trip is what proves it
 * did. The gateway stands for no card, because selecting nothing is what reads as the gateway.
 */
export function nodeIdOf(subject: InspectorSubject): string | undefined {
  return subject.kind === 'draft' ? DRAFT_CARD : (modelCardOf(subject) ?? targetCardOf(subject));
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
