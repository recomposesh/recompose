import type { XY } from '../../lib/canvas-positions';
import type { CanvasWorld, PickerStanding } from './canvas-standings';

import { keepCanvasPositions, setNodePosition } from '../../lib/canvas-position-store';
import { childSeatBeside } from '../../lib/tidy-layout';
import { seatBeyond } from './canvas-wiring';

/**
 * Where the target a pick brings into being stands, whichever way the ask was opened.
 *
 * @summary A cable let go on open canvas names its own point and the born card takes it, so what a
 * person aimed at is where the composition grows. An ask opened on a card names no point, so the
 * card seats beyond the one that asked, on the free row of that column: seating it anywhere else
 * leaves a child standing away from the router that holds it, with its cable crossing the canvas.
 */
function seatForTheBornTarget(world: CanvasWorld, picker: PickerStanding): XY {
  return 'at' in picker ? picker.at : seatBeyond(world.graph.nodes, world.seats, picker.from);
}

/**
 * Hands back the seating a completed pick owes the target card it brings into being.
 *
 * @summary It seats nothing when the account already stands on the canvas, because a card a person
 * can see is one they placed rather than one this pick is making. A conditional birth stores two
 * nodes in the one write and can name only the router beforehand, so the branch that catches
 * everything else arrives here as a second card and takes the seat beside it: left to the free row
 * it would land at the foot of the canvas with its cable running the length of the pane.
 */
export function seatedWhereItBelongs(
  world: CanvasWorld,
  bornTargetId: string,
  alsoBorn?: string,
): () => void {
  const picker = world.standings.picker;
  const alreadyStanding = world.graph.nodes.some((node) => node.id === bornTargetId);
  const at = picker === undefined ? undefined : seatForTheBornTarget(world, picker);

  return () => {
    if (at === undefined || alreadyStanding) {
      return;
    }

    setNodePosition(world.slug, bornTargetId, at);

    if (alsoBorn !== undefined) {
      setNodePosition(world.slug, alsoBorn, childSeatBeside(at));
    }

    keepCanvasPositions(world.slug);
  };
}

/**
 * Where the canvas looks once the card is born, or nowhere where it needs no look.
 *
 * @summary A cable let go names its own point, so the person is already looking where the card
 * lands and the view staying put is what keeps a completed pick from lurching. An ask names no
 * point at all, so the seat it works out can fall past the pane and the view has to widen for it.
 */
export function lookAfterTheBornTarget(world: CanvasWorld, bornTargetId: string): XY | undefined {
  const picker = world.standings.picker;
  const alreadyStanding = world.graph.nodes.some((node) => node.id === bornTargetId);

  if (picker === undefined || alreadyStanding) {
    return undefined;
  }

  if ('at' in picker) {
    return picker.origin === 'drop' ? undefined : picker.at;
  }

  return seatBeyond(world.graph.nodes, world.seats, picker.from);
}
