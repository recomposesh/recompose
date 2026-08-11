import type { XY } from '../../lib/canvas-positions';
import type { CanvasWorld } from './canvas-standings';

import { cardFitsTheView, viewportOf } from '../../lib/canvas-viewport';
import { CARD_MEASURE } from './canvas-wiring';

function boundsAroundEveryCard(world: CanvasWorld, born: XY) {
  const stands = [...Object.values(world.seats), born];
  const x = Math.min(...stands.map((seat) => seat.x));
  const y = Math.min(...stands.map((seat) => seat.y));

  return {
    x,
    y,
    width: Math.max(...stands.map((seat) => seat.x)) + CARD_MEASURE.width - x,
    height: Math.max(...stands.map((seat) => seat.y)) + CARD_MEASURE.height - y,
  };
}

/**
 * Zooms the view out until a card born at the seat shows, and moves nothing when it already does.
 *
 * @summary A target born from the keyboard ask takes its column seat, which can stand past the
 * pane at the zoom a person was working at. A composition that grew where nobody can see it reads
 * as a pick that did nothing, so the view widens exactly then and holds still otherwise. The
 * bounds come from the seats this side already holds rather than from the flow, because the born
 * card reaches the flow a render after the write lands. The look itself waits two frames, since
 * the pick also opens the inspector and the pane it narrows is the pane the card must fit.
 */
function fitTheBornCard(world: CanvasWorld, seat: XY): void {
  const view = world.view.current;
  const pane = document.querySelector('.react-flow')?.getBoundingClientRect();

  if (view === null || pane === undefined) {
    return;
  }

  if (cardFitsTheView(seat, CARD_MEASURE, viewportOf(view), pane)) {
    return;
  }

  void view.fitBounds(boundsAroundEveryCard(world, seat), { padding: 0.1 });
}

export function shownWhereItWasBorn(world: CanvasWorld, seat: XY | undefined): void {
  if (seat === undefined) {
    return;
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      fitTheBornCard(world, seat);
    });
  });
}
