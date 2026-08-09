import type { GatewayConfig } from '@recompose/contracts';
import type { Connection, Edge, Node, NodeChange } from '@xyflow/react';

import type { NodePositions, XY } from '../../lib/canvas-positions';
import type { CanvasEdge, CanvasGraph, CanvasNode } from '../../lib/node-graph';
import type { InspectorSubject } from '../gateway-drawer/gateway-drawer';

/** The two asks a card can hang off its port, which the page answers. */
export type CanvasAsks = {
  /** Receives the gateway plus, which births the draft virtual model. */
  onAddVirtualModel: () => void;
  /** Receives a model or draft plus, which opens the picker for that card. */
  onPickTargetFor: (from: string) => void;
};

/** One seat a position change moved, and whether the drag settled there. */
export type MovedSeat = { id: string; to: XY; settled: boolean };

const CARD_MEASURE = { width: 158, height: 78 };

/** The definition id inside a model card's node id, or nothing for any other card. */
export function modelIdOf(nodeId: string): string | undefined {
  return nodeId.startsWith('model:') ? nodeId.slice('model:'.length) : undefined;
}

/** The account id inside a target card's node id, or nothing for any other card. */
export function accountIdOf(nodeId: string): string | undefined {
  return nodeId.startsWith('target:') ? nodeId.slice('target:'.length) : undefined;
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
    const accountId = accountIdOf(connection.target);

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
 * The edge objects the flow renders, one binding cable each plus the overlay pair.
 *
 * @summary The overlay cables take no selection and no reconnect drag, because they stand for
 * work in flight rather than stored bindings, and the gestures that rebind or release belong to
 * the bindings alone.
 */
export function flowEdgesOf(edges: readonly CanvasEdge[], selection: string | undefined): Edge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'cable',
    data: { standing: edge.standing },
    selected: edge.id === selection,
    ...(bindingCableId(edge.id) === undefined ? { selectable: false, reconnectable: false } : {}),
  }));
}

function prefixedSubject(selection: string): InspectorSubject | undefined {
  const modelId = modelIdOf(selection);

  if (modelId !== undefined) {
    return { kind: 'virtual-model', modelId };
  }

  const cableId = bindingCableId(selection);

  if (cableId !== undefined) {
    return { kind: 'cable', modelId: cableId };
  }

  const accountId = accountIdOf(selection);

  if (accountId !== undefined) {
    return { kind: 'target', accountId };
  }

  return undefined;
}

function ghostSubject(selection: string): InspectorSubject | undefined {
  return selection.startsWith('ghost:')
    ? { kind: 'ghost-target', accountId: selection.slice('ghost:'.length) }
    : undefined;
}

/**
 * The subject the inspector speaks for, read off whatever stands selected.
 *
 * @summary Nothing selected reads as the gateway, because the gateway is what the whole screen is
 * about, and a selection with no body of its own falls back the same way rather than standing the
 * inspector in front of nothing.
 */
export function subjectOf(selection: string | undefined): InspectorSubject {
  if (selection === undefined) {
    return { kind: 'gateway' };
  }

  if (selection === 'draft') {
    return { kind: 'draft' };
  }

  return prefixedSubject(selection) ?? ghostSubject(selection) ?? { kind: 'gateway' };
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
