import type { WindowControls } from '@recompose/contracts';

/**
 * How the sidebar's top band spreads what it carries.
 *
 * @summary The band clears whichever edge the window controls take, so its own contents go to the
 * other one. Where the controls take neither edge the band carries the title the hidden bar took
 * away at its leading end and the control at its trailing end, which is both ends at once.
 */
export function bandAlignmentFor(windowControls: WindowControls): string {
  if (windowControls === 'leading') {
    return 'justify-end';
  }

  return windowControls === 'trailing' ? 'justify-between' : 'justify-start';
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
