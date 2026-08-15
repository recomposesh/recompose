import type { OnConnectEnd } from '@xyflow/react';

import type { XY } from '../../lib/canvas-positions';
import type { CanvasFlowWiring } from '../gateway-stage/gateway-stage';
import type { CanvasStandings, CanvasWorld } from './canvas-standings';

import { closeInspector, inspectorOpen, toggleInspector } from '../../../../shared/lib';
import { flowPointOf, viewportOf } from '../../lib/canvas-viewport';
import { emptyDefinition } from '../../lib/model-draft';
import { columnBeyond, MODEL_COLUMN, seatForNewNode } from '../../lib/tidy-layout';
import { heldDraft, startDrafting } from '../../lib/use-held-draft';
import { appliedSeatMoves, tidiedArrangement } from './arrangement-gestures';
import {
  bindingCableId,
  cableAddressOf,
  CARD_MEASURE,
  flowEdgesOf,
  flowNodesOf,
  modelIdOf,
  oneTargetRule,
  routerAddressOf,
  targetAccountIdIn,
} from './canvas-wiring';
import { deletionWiring } from './deletion-gestures';

function revealOn(standings: CanvasStandings, subject: string): void {
  standings.select(subject);

  if (!inspectorOpen()) {
    toggleInspector();
  }
}

/**
 * The seat a card born under a pointer takes, which centers it on the point rather than hanging it.
 *
 * @summary A seat names a card's top corner while a pointer names the middle of what the person
 * aimed at, so half the card comes off the point to turn one into the other. Only a birth a pointer
 * named reads this: a seat the canvas worked out is already a corner, and lifting one again walks
 * the card up the column by half a card every time it is asked for.
 */
function seatUnder(pointer: XY): XY {
  return { x: pointer.x, y: pointer.y - CARD_MEASURE.height / 2 };
}

function birthedDraftAt(world: CanvasWorld, seat: XY): void {
  const definition = heldDraft(world.slug)?.definition ?? emptyDefinition();

  startDrafting(world.slug, definition, seat);
  revealOn(world.standings, 'draft');
}

function openedStageTwo(
  world: CanvasWorld,
  from: string,
  target: string,
  replacing?: string,
): void {
  const accountId = targetAccountIdIn(world.gateway, target);

  if (accountId !== undefined) {
    world.standings.setPicker({
      step: 'provider-model',
      from,
      accountId,
      anchor: target,
      replacing,
    });
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
  'A cable binds a virtual model or a router to a stored target it does not already hold, and nothing else connects.';

function asksWhatToBind(from: string): boolean {
  return from === 'draft' || modelIdOf(from) !== undefined || routerAddressOf(from) !== undefined;
}

function landedOnOpenCanvas(world: CanvasWorld, from: string, at: XY): void {
  if (from === 'gateway') {
    birthedDraftAt(world, seatUnder(at));

    return;
  }

  if (asksWhatToBind(from)) {
    world.standings.setPicker({
      step: 'kind',
      from,
      at: seatUnder(at),
      origin: 'drop',
    });

    if (from === 'draft') {
      closeInspector();
    }
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
        openedStageTwo(
          world,
          connection.source,
          connection.target,
          cableAddressOf(oldEdge.id)?.routeNodeId,
        );
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
        standings.setPicker(undefined);

        return;
      }

      standings.select(undefined);

      if (inspectorOpen()) {
        toggleInspector();
      }
    },
  };
}

/**
 * Where a card bound through a plus is born, which is the free row beyond the card that asked.
 *
 * @summary A plus and a dropped cable are twins, so the one that names no point of its own reads
 * the column off the card it left rather than off the binding column: a child born from a router's
 * plus would otherwise land in that router's own column with its cable running backwards, and the
 * pointer and the keyboard would disagree about where a composition grows.
 */
function seatForABoundCard(world: CanvasWorld, from: string): XY {
  const parent = world.graph.nodes.find((node) => node.id === from);

  return seatForNewNode(columnBeyond(parent), world.seats);
}

/**
 * Where the gateway's plus stands a draft, which is the free row under the model column.
 *
 * @summary The plus names no point, so the seat comes from the same arrangement rule every other
 * new card reads rather than from an offset of its own. A draft already standing keeps the seat it
 * stands at, because a person who dragged that card said where it belongs and a second press asks
 * to go on editing it rather than to move it.
 */
function seatForABornDraft(world: CanvasWorld): XY {
  return heldDraft(world.slug)?.seat ?? seatForNewNode(MODEL_COLUMN, world.seats);
}

function cardAsks(world: CanvasWorld) {
  return {
    onAddVirtualModel: () => {
      birthedDraftAt(world, seatForABornDraft(world));
    },
    onBindFrom: (from: string) => {
      world.standings.setPicker({
        step: 'kind',
        from,
        at: seatForABoundCard(world, from),
        origin: 'ask',
      });
    },
  };
}

/**
 * The whole controlled flow, wired from the derived graph and the canvas standings.
 *
 * @summary Nodes and edges go in derived and only gestures come back out: position changes move
 * seats and everything else answers through a named act, so no gesture ever writes topology
 * anywhere but the stored gateway.
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
    onNodeFocus: (nodeId) => {
      if (world.standings.selection !== nodeId) {
        world.standings.select(nodeId);
      }
    },
  };
}
