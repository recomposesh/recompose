import type { WindowControls } from '@recompose/contracts';

const BAND_ALIGNMENTS: Record<WindowControls, string> = {
  leading: 'justify-end',
  none: 'justify-start',
  trailing: 'justify-between',
};

/**
 * How the sidebar's top band spreads what it carries.
 *
 * @summary Only the platform that hides its title bar and floats nothing over the corner it left
 * carries a brand there, so only that band holds two ends apart. macOS hides the same bar but keeps
 * the traffic lights on that corner, and the lone control sharing a band with them belongs at the
 * far end of it. A platform still drawing its own title bar floats nothing anywhere, so its lone
 * control sits at the edge the rest of the sidebar reads from.
 */
export function bandAlignmentFor(windowControls: WindowControls): string {
  return BAND_ALIGNMENTS[windowControls];
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
