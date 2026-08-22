import type { XY } from './canvas-positions';

/** How wide the picker's own panel is, which is what has to clear the pane's far edge. */
export const PICKER_WIDTH = 256;

type PaneReach = { width: number; height: number };

type Viewport = { x: number; y: number; zoom: number };

/**
 * Where the picker's panel stands so the whole of it lands inside the pane.
 *
 * @summary A card near the pane's far edge would hang its picker past that edge, where the panel is
 * clipped: a person sees a list they cannot reach, and a pointer aimed at a row lands on nothing.
 * The panel slides back along the pane rather than flipping to the other side of its card, because
 * a picker that jumps sides as a person pans reads as a different picker each time. Nothing moves
 * while the whole panel already fits, so the common case stays anchored exactly on its card.
 */
export function pickerStandsAt(seat: XY, viewport: Viewport, pane: PaneReach): XY {
  const wanted = viewport.x + seat.x * viewport.zoom;
  const panel = PICKER_WIDTH * viewport.zoom;
  const furthest = pane.width - panel;

  return {
    x: furthest < 0 ? wanted : Math.min(wanted, furthest),
    y: viewport.y + seat.y * viewport.zoom,
  };
}
