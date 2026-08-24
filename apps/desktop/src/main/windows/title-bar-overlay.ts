export type WindowScheme = 'light' | 'dark';

export type TitleBarOverlay = {
  color: string;
  symbolColor: string;
  height: number;
};

const TOOLBAR_HEIGHT = 54;

const TOOLBAR_HAIRLINE = 1;

const STRIP_HEIGHT = TOOLBAR_HEIGHT - TOOLBAR_HAIRLINE;

const overlays: Record<WindowScheme, TitleBarOverlay> = {
  light: { color: '#f4f4f6', symbolColor: '#1c1c1e', height: STRIP_HEIGHT },
  dark: { color: '#28282c', symbolColor: '#f9f9fb', height: STRIP_HEIGHT },
};

/**
 * The caption strip Windows draws over the renderer once the title bar is hidden.
 *
 * @summary Windows paints the caption buttons itself and takes no stylesheet, so the two colors
 * are stated here as the toolbar surface and the ink the renderer would have painted under them.
 * The strip stands as tall as the toolbar less its hairline: Windows centres the buttons in
 * whatever height it is given, so anything shorter lifts them above every control beside them,
 * and anything taller paints over the line under the bar and leaves it stopping mid-window.
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
