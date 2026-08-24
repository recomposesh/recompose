export type WindowScheme = 'light' | 'dark';

export type TitleBarOverlay = {
  color: string;
  symbolColor: string;
  height: number;
};

const TOOLBAR_HEIGHT = 54;

const overlays: Record<WindowScheme, TitleBarOverlay> = {
  light: { color: '#f4f4f6', symbolColor: '#1c1c1e', height: TOOLBAR_HEIGHT },
  dark: { color: '#28282c', symbolColor: '#f9f9fb', height: TOOLBAR_HEIGHT },
};

/**
 * The caption strip Windows draws over the renderer once the title bar is hidden.
 *
 * @summary Windows paints the caption buttons itself and takes no stylesheet, so the two colors
 * are stated here as the toolbar surface and the ink the renderer would have painted under them.
 * The height matches the toolbar the strip is drawn over, because Windows centres the buttons in
 * whatever height it is given, and a shorter strip centres them above every control beside them.
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
