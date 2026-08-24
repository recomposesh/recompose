import type { WindowControls } from '@recompose/contracts';

/** Which end of the sidebar's top band the control stands at, which is the end left free. */
export function bandAlignmentFor(windowControls: WindowControls): string {
  return windowControls === 'leading' ? 'justify-end' : 'justify-start';
}

/**
 * How far a bar holds its acts off the leading edge.
 *
 * @summary Only the platform that floats its controls over that edge asks for more than the
 * ordinary inset, and only once the sidebar has gone out from under them.
 */
export function barLeadInsetFor(windowControls: WindowControls, sidebarAway: boolean): string {
  return windowControls === 'leading' && sidebarAway ? 'ps-window-controls-width' : 'ps-3.5';
}

/**
 * How far a bar holds its acts off the trailing edge.
 *
 * @summary The caption buttons stand over that edge for as long as the window does, with no
 * sidebar to cover them, so the clearance never lifts on the platform that draws them.
 */
export function barTailInsetFor(windowControls: WindowControls): string {
  return windowControls === 'trailing' ? 'pe-window-caption' : 'pe-3.5';
}

/**
 * Whether a surface holding no gateway paints its bar rather than leaving bare drag space.
 *
 * @summary A bar reporting nothing reads as a mistake, which is why the space stays bare while the
 * sidebar carries the only control. Where the caption buttons stand on that space it is a title
 * bar whatever the app paints, so painting it is what stops the buttons floating over nothing.
 */
export function barStandsFor(windowControls: WindowControls, sidebarAway: boolean): boolean {
  return sidebarAway || windowControls === 'trailing';
}
