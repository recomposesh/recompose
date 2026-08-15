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
 * card reaches the flow a render after the write lands.
 */
function fitTheBornCard(world: CanvasWorld, seat: XY, pane: DOMRect): void {
  const view = world.view.current;

  if (view === null || cardFitsTheView(seat, CARD_MEASURE, viewportOf(view), pane)) {
    return;
  }

  void view.fitBounds(boundsAroundEveryCard(world, seat), { padding: 0.1 });
}

/** The pane a born card has to fit inside, or nothing at all while the canvas stands hidden. */
function paneTheCanvasShows(): DOMRect | undefined {
  const pane = document.querySelector('.react-flow')?.getBoundingClientRect();

  if (pane === undefined || pane.width === 0 || pane.height === 0) {
    return undefined;
  }

  return pane;
}

/**
 * Looks at the born card once there is a canvas to look at, and asks nothing of one that never is.
 *
 * @summary React hides a suspended subtree outright, and a hidden pane measures nothing, which
 * reads exactly like a card standing past it. Widening the view on that reading moves the canvas
 * for a card that shows fine, so the look waits for the box to come back rather than judging a
 * canvas nobody can see. The wait is the platform's own, because how long a page suspends is a
 * question about data rather than about frames.
 */
function lookedAtOnceTheCanvasShows(world: CanvasWorld, seat: XY): void {
  const showing = paneTheCanvasShows();

  if (showing !== undefined) {
    fitTheBornCard(world, seat, showing);

    return;
  }

  const canvas = document.querySelector('.react-flow');

  if (canvas === null) {
    return;
  }

  const watch = new ResizeObserver(() => {
    const shown = paneTheCanvasShows();

    if (shown !== undefined) {
      watch.disconnect();
      fitTheBornCard(world, seat, shown);
    }
  });

  watch.observe(canvas);
}

/**
 * Shows a card born at a seat, once the canvas has settled around the birth.
 *
 * @summary The look waits two frames before it measures anything, since the birth also opens the
 * inspector and the pane it narrows is the pane the card must fit.
 */
export function shownWhereItWasBorn(world: CanvasWorld, seat: XY | undefined): void {
  if (seat === undefined) {
    return;
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      lookedAtOnceTheCanvasShows(world, seat);
    });
  });
}
