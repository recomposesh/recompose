import type { XY } from '../../lib/canvas-positions';
import type { CanvasFlowWiring } from '../gateway-stage/gateway-stage';
import type { CanvasWorld } from './canvas-standings';

import {
  dropCanvasPositions,
  keepCanvasPositions,
  setNodePosition,
} from '../../lib/canvas-position-store';
import { satelliteOffset, satelliteOffsetKey, tidyPositions } from '../../lib/tidy-layout';
import { moveDraftSeat } from '../../lib/use-held-draft';
import { movedSeats } from './canvas-wiring';

/**
 * What the arrangement remembers one card by, which for a judge is a distance rather than a point.
 *
 * @summary A satellite stands off the router it advises, so remembering where it landed on the
 * canvas would strand it the moment that router moved. The distance survives the router's own
 * drags, and it is written under a name of its own so the tidy arrangement drops it and the
 * satellite returns to its shoulder.
 */
function rememberedMove(world: CanvasWorld, moved: { id: string; to: XY }): [string, XY] {
  const judge = world.graph.nodes.find((node) => node.id === moved.id);
  const router = judge?.kind === 'judge' ? world.seats[judge.advises] : undefined;

  if (router === undefined) {
    return [moved.id, moved.to];
  }

  return [satelliteOffsetKey(moved.id), satelliteOffset(router, moved.to)];
}

/**
 * Moves each dragged card's seat to where the drag says, writing the arrangement once it settles.
 *
 * @summary The overlay cards move through their own standings, because a draft and a pending card
 * belong to the gesture that made them rather than to the written arrangement.
 */
export function appliedSeatMoves(world: CanvasWorld): CanvasFlowWiring['onNodesChange'] {
  return (changes) => {
    for (const moved of movedSeats(changes)) {
      if (moved.id === 'draft') {
        moveDraftSeat(world.slug, moved.to);
      } else if (moved.id === 'pending') {
        world.standings.movePendingTo(moved.to);
      } else {
        const [remembers, at] = rememberedMove(world, moved);

        setNodePosition(world.slug, remembers, at);

        if (moved.settled) {
          keepCanvasPositions(world.slug);
        }
      }
    }
  };
}

/**
 * Drops the written arrangement so every card returns to its tidy seat, overlay cards included.
 *
 * @summary The overlay cards take their tidy seats through their own standings, since neither the
 * draft nor the pending card ever sits in the written arrangement the drop just emptied.
 */
export function tidiedArrangement(world: CanvasWorld): () => void {
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
