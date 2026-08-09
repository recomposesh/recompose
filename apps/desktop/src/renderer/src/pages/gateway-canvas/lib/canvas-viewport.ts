import type { Viewport } from '@xyflow/react';

import type { XY } from './canvas-positions';

/** Anything that can say what the canvas is showing, which is the flow itself once it stands. */
type ShowingCanvas = { getViewport: () => Viewport };

/** Where the canvas stands before anybody pans or zooms it, which is what a fresh visit shows. */
export const RESTING_VIEWPORT: Viewport = { x: 48, y: 48, zoom: 1 };

/** What the canvas is showing right now, or its resting camera while the flow is still mounting. */
export function viewportOf(view: ShowingCanvas | null): Viewport {
  return view?.getViewport() ?? RESTING_VIEWPORT;
}

/**
 * Where a point on the canvas surface stands in the flow's own coordinates.
 *
 * @summary A pointer meets the pane, and the library reports a landing as the offset into that
 * pane, so a card seated from it lands the pan away from where the person let go and drifts
 * further with every zoom. Undoing the viewport is what turns the place a person pointed at into
 * the place a card stands.
 */
export function flowPointOf(at: XY, viewport: Viewport): XY {
  return { x: (at.x - viewport.x) / viewport.zoom, y: (at.y - viewport.y) / viewport.zoom };
}
