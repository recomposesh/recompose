import type { Edge, Node, OnConnectEnd } from '@xyflow/react';

import type { XY } from '../../lib/canvas-positions';
import type { CanvasFlowWiring } from '../gateway-stage/gateway-stage';
import type { CanvasStandings, CanvasWorld } from './canvas-standings';

import { inspectorOpen, toggleInspector } from '../../../../shared/lib';
import {
  dropCanvasPositions,
  keepCanvasPositions,
  setNodePosition,
} from '../../lib/canvas-position-store';
import { flowPointOf, viewportOf } from '../../lib/canvas-viewport';
import { emptyDefinition } from '../../lib/model-draft';
import { seatForNewNode, tidyPositions } from '../../lib/tidy-layout';
import { heldDraft, moveDraftSeat, startDrafting } from '../../lib/use-held-draft';
import { releasedBinding } from './binding-acts';
import {
  accountIdOf,
  bindingCableId,
  editingText,
  flowEdgesOf,
  flowNodesOf,
  modelIdOf,
  movedSeats,
  oneTargetRule,
} from './canvas-wiring';

function revealOn(standings: CanvasStandings, subject: string): void {
  standings.select(subject);

  if (!inspectorOpen()) {
    toggleInspector();
  }
}

function birthedDraftAt(world: CanvasWorld, at: XY): void {
  const definition = heldDraft(world.slug)?.definition ?? emptyDefinition();

  startDrafting(world.slug, definition, at);
  revealOn(world.standings, 'draft');
}

function openedStageTwo(world: CanvasWorld, from: string, target: string): void {
  const accountId = accountIdOf(target);

  if (accountId !== undefined) {
    world.standings.setPicker({ step: 'provider-model', from, accountId, anchor: target });
  }
}

function escapedOrLanded(world: CanvasWorld, landed: boolean): boolean {
  world.dragging.current.inFlight = false;

  if (world.dragging.current.escaped) {
    world.dragging.current.escaped = false;

    return true;
  }

  return landed;
}

const REFUSED_LANDING =
  'A cable binds a virtual model to a stored target it does not already hold, and nothing else connects.';

function landedOnOpenCanvas(world: CanvasWorld, from: string, at: XY): void {
  if (from === 'gateway') {
    birthedDraftAt(world, at);

    return;
  }

  if (from === 'draft' || modelIdOf(from) !== undefined) {
    world.standings.setPicker({ step: 'account', from, at });
  }
}

function droppedCableLanding(world: CanvasWorld): OnConnectEnd {
  return (_, state) => {
    if (escapedOrLanded(world, state.isValid === true) || state.to === null) {
      return;
    }

    if (state.toHandle !== null) {
      world.standings.announce({ kind: 'refused', refusal: REFUSED_LANDING });

      return;
    }

    landedOnOpenCanvas(
      world,
      state.fromNode.id,
      flowPointOf(state.to, viewportOf(world.view.current)),
    );
  };
}

function connectWiring(
  world: CanvasWorld,
): Pick<
  CanvasFlowWiring,
  | 'isValidConnection'
  | 'onConnect'
  | 'onConnectStart'
  | 'onConnectEnd'
  | 'onReconnect'
  | 'onReconnectStart'
  | 'onReconnectEnd'
> {
  const { dragging } = world;

  return {
    isValidConnection: oneTargetRule(world.gateway),
    onConnect: (connection) => {
      if (dragging.current.escaped) {
        return;
      }

      openedStageTwo(world, connection.source, connection.target);
    },
    onConnectStart: () => {
      dragging.current.inFlight = true;
    },
    onConnectEnd: droppedCableLanding(world),
    onReconnect: (oldEdge, connection) => {
      if (dragging.current.escaped) {
        return;
      }

      if (oldEdge.source === connection.source) {
        openedStageTwo(world, connection.source, connection.target);
      }
    },
    onReconnectStart: () => {
      dragging.current.inFlight = true;
    },
    onReconnectEnd: () => {
      dragging.current.inFlight = false;
      dragging.current.escaped = false;
    },
  };
}

function pressedTheCardItself(target: EventTarget | null): boolean {
  const pressed = target instanceof Element ? target.closest('button') : null;

  return pressed?.hasAttribute('aria-pressed') ?? false;
}

function selectionWiring(
  world: CanvasWorld,
): Pick<CanvasFlowWiring, 'onNodeClick' | 'onEdgeClick' | 'onPaneClick'> {
  const { standings } = world;

  return {
    onNodeClick: (event, node) => {
      if (pressedTheCardItself(event.target)) {
        revealOn(standings, node.id);
      }
    },
    onEdgeClick: (_, edge) => {
      if (bindingCableId(edge.id) !== undefined) {
        revealOn(standings, edge.id);
      }
    },
    onPaneClick: () => {
      if (standings.picker !== undefined) {
        return;
      }

      standings.select(undefined);

      if (inspectorOpen()) {
        toggleInspector();
      }
    },
  };
}

function deletionDecision(
  world: CanvasWorld,
  asked: { nodes: Node[]; edges: Edge[] },
): boolean | { nodes: Node[]; edges: Edge[] } {
  if (editingText(document.activeElement)) {
    return false;
  }

  const removable = asked.nodes.find(
    (node) => node.id === 'draft' || modelIdOf(node.id) !== undefined,
  );

  if (removable !== undefined) {
    world.standings.setRemoving(removable.id);

    return false;
  }

  if (asked.nodes.length > 0) {
    return false;
  }

  const cables = asked.edges.filter((edge) => bindingCableId(edge.id) !== undefined);

  return cables.length > 0 ? { nodes: [], edges: cables } : false;
}

function deletionWiring(
  world: CanvasWorld,
): Pick<CanvasFlowWiring, 'onBeforeDelete' | 'onEdgesDelete'> {
  return {
    onBeforeDelete: async (asked) => Promise.resolve(deletionDecision(world, asked)),
    onEdgesDelete: (deleted) => {
      for (const edge of deleted) {
        const modelId = bindingCableId(edge.id);

        if (modelId !== undefined) {
          releasedBinding(world, modelId);
        }
      }
    },
  };
}

function appliedSeatMoves(world: CanvasWorld): CanvasFlowWiring['onNodesChange'] {
  return (changes) => {
    for (const moved of movedSeats(changes)) {
      if (moved.id === 'draft') {
        moveDraftSeat(world.slug, moved.to);
      } else if (moved.id === 'pending') {
        world.standings.movePendingTo(moved.to);
      } else {
        setNodePosition(world.slug, moved.id, moved.to);

        if (moved.settled) {
          keepCanvasPositions(world.slug);
        }
      }
    }
  };
}

function tidiedArrangement(world: CanvasWorld): () => void {
  return () => {
    dropCanvasPositions(world.slug);

    const tidy = tidyPositions(world.graph.nodes);
    const draftSeat = tidy['draft'];
    const pendingSeat = tidy['pending'];

    if (draftSeat !== undefined) {
      moveDraftSeat(world.slug, draftSeat);
    }

    if (pendingSeat !== undefined) {
      world.standings.movePendingTo(pendingSeat);
    }
  };
}

function cardAsks(world: CanvasWorld) {
  return {
    onAddVirtualModel: () => {
      birthedDraftAt(
        world,
        heldDraft(world.slug)?.seat ?? seatForNewNode('draft-model', world.seats),
      );
    },
    onPickTargetFor: (from: string) => {
      world.standings.setPicker({
        step: 'account',
        from,
        at: seatForNewNode('pending-target', world.seats),
      });
    },
  };
}

/**
 * The whole controlled flow, wired from the derived graph and the canvas standings.
 *
 * @summary Nodes and edges go in derived and only gestures come back out: position changes move
 * seats and everything else answers through a named act, so no gesture ever writes topology
 * anywhere but the stored gateway. The one silent path is a pane click while the picker stands,
 * because Esc is the picker's one way out and a stray click must not become a second one.
 */
export function flowWiring(world: CanvasWorld): CanvasFlowWiring {
  return {
    nodes: flowNodesOf(world.graph, world.seats, world.standings.selection, cardAsks(world)),
    edges: flowEdgesOf(world.graph.edges, world.standings.selection),
    onNodesChange: appliedSeatMoves(world),
    onInit: (instance) => {
      world.view.current = instance;
    },
    ...selectionWiring(world),
    ...connectWiring(world),
    ...deletionWiring(world),
    onTidy: tidiedArrangement(world),
  };
}
