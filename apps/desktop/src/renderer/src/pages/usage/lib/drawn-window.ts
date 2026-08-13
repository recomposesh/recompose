import type { UsageWindow } from './usage-window';

import { atClock, clockOf } from './clock-edges';

export type DrawnWindow = {
  /** The window the calendar paints. */
  window: UsageWindow;
  /** Whether the next day pressed closes this window rather than opening a new one. */
  drawing: boolean;
};

/** A window standing settled, so the next day pressed opens a new one over itself. */
export function settledDrawing(window: UsageWindow): DrawnWindow {
  return { window, drawing: false };
}

/**
 * The window after one day is pressed on the calendar.
 *
 * @summary A settled window never widens under a press. The day pressed opens a new window over
 * itself and the press after it closes that window, which is what a person drawing a range means
 * by two clicks. The calendar library's own range walk cannot do this, because a settled window
 * reaches it as a complete range and every complete range it sees moves an edge. Both edges keep
 * the clock they already stood at, and the window never closes before it opens.
 */
export function drawnWith(drawn: DrawnWindow, day: number): DrawnWindow {
  const opened = atClock(day, clockOf(drawn.window.from));
  const closed = atClock(day, clockOf(drawn.window.to));

  if (!drawn.drawing) {
    return { window: { from: opened, to: Math.max(opened, closed) }, drawing: true };
  }

  if (opened < drawn.window.from) {
    return { window: { from: opened, to: drawn.window.to }, drawing: false };
  }

  return {
    window: { from: drawn.window.from, to: Math.max(drawn.window.from, closed) },
    drawing: false,
  };
}
