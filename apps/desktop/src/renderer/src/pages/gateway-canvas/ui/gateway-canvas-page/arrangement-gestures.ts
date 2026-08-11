import type { CanvasFlowWiring } from '../gateway-stage/gateway-stage';
import type { CanvasWorld } from './canvas-standings';

import {
  dropCanvasPositions,
  keepCanvasPositions,
  setNodePosition,
} from '../../lib/canvas-position-store';
import { tidyPositions } from '../../lib/tidy-layout';
import { moveDraftSeat } from '../../lib/use-held-draft';
import { movedSeats } from './canvas-wiring';

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
        setNodePosition(world.slug, moved.id, moved.to);

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
