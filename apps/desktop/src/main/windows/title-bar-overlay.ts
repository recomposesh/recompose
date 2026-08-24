export type WindowScheme = 'light' | 'dark';

export type TitleBarOverlay = {
  color: string;
  symbolColor: string;
  height: number;
};

const BAND_HEIGHT = 36;

const overlays: Record<WindowScheme, TitleBarOverlay> = {
  light: { color: '#f4f4f6', symbolColor: '#1c1c1e', height: BAND_HEIGHT },
  dark: { color: '#28282c', symbolColor: '#f9f9fb', height: BAND_HEIGHT },
};

/**
 * The caption strip Windows draws over the renderer once the title bar is hidden.
 *
 * @summary Windows paints the caption buttons itself and takes no stylesheet, so the two colors
 * are stated here as the toolbar surface and the ink the renderer would have painted under them.
 * The height matches the band the sidebar clears, so the buttons sit on the row the shell already
 * keeps free rather than over the first thing it draws.
 */
export function titleBarOverlayFor(scheme: WindowScheme): TitleBarOverlay {
  return overlays[scheme];
}

/**
 * Whether this platform holds a caption strip the app has to repaint when the scheme turns.
 *
 * @summary Only Windows draws one, and `setTitleBarOverlay` exists on no other platform.
 */
export function titleBarOverlayPaintsOn(platform: NodeJS.Platform): boolean {
  return platform === 'win32';
}
