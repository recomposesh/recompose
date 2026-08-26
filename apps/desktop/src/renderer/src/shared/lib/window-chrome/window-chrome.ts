import type { WindowControls } from '@recompose/contracts';

/**
 * How the sidebar's top band spreads what it carries.
 *
 * @summary Wherever the window hides the platform's title bar, the band stands in for it: the brand
 * at its leading end and the control at its trailing end, which is both ends at once. Only where
 * the platform keeps drawing its own title bar does the band carry the control alone, and a lone
 * control belongs at the edge the rest of the sidebar reads from.
 */
export function bandAlignmentFor(windowControls: WindowControls): string {
  return windowControls === 'none' ? 'justify-start' : 'justify-between';
}

/**
 * How far the sidebar band holds its brand off the leading edge.
 *
 * @summary The traffic lights float over that corner of the sidebar itself rather than over a bar
 * above it, so the clearance stands for as long as the band is drawn. Nothing lifts it: unlike the
 * toolbar's, this inset never waits on the sidebar going away, because the sidebar is what the
 * controls are drawn on top of.
 */
export function bandLeadInsetFor(windowControls: WindowControls): string {
  return windowControls === 'leading' ? 'ps-window-controls-width' : 'ps-1';
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
