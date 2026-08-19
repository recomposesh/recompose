import type { XY } from '../../lib/canvas-positions';
import type { CanvasFlowWiring } from '../gateway-stage/gateway-stage';
import type { CanvasWorld } from './canvas-standings';

import { inspectorOpen, toggleInspector } from '../../../../shared/lib';
import { columnBeyond, MODEL_COLUMN, seatForNewNode } from '../../lib/tidy-layout';
import { heldDraft } from '../../lib/use-held-draft';
import { appliedSeatMoves, tidiedArrangement } from './arrangement-gestures';
import { shownWhereItWasBorn } from './born-card-camera';
import { birthedDraftAt, connectWiring } from './cable-gestures';
import { cableLandings } from './cable-rules';
import { revealOn } from './canvas-standings';
import { bindingCableId, flowEdgesOf, flowNodesOf } from './canvas-wiring';
import { deletionWiring } from './deletion-gestures';

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

/**
 * The asks a card hangs off its own port, which a keyboard reaches without a pointer.
 *
 * @summary A plus names no point, so what it stands can seat past the pane at the zoom a person
 * was working at, and the view widens until it shows. A cable let go names its own point and gets
 * no such look, which is the line a completed pick already draws.
 */
function cardAsks(world: CanvasWorld) {
  return {
    onAddVirtualModel: () => {
      const seat = seatForABornDraft(world);

      birthedDraftAt(world, seat);
      shownWhereItWasBorn(world, seat);
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
    nodes: flowNodesOf(
      world.graph,
      world.seats,
      world.standings.selection,
      cardAsks(world),
      cableLandings(world.gateway),
    ),
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
