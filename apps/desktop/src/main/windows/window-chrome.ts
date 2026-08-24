import { BrowserWindow, systemPreferences } from 'electron';

import type { WindowScheme } from './title-bar-overlay';

import { performTitleBarDoubleClick } from './title-bar-double-click';
import { titleBarOverlayFor, titleBarOverlayPaintsOn } from './title-bar-overlay';
import { windowButtonsMoveOn } from './window-buttons';

function doubleClickPreference(platform: NodeJS.Platform): string | null {
  return platform === 'darwin'
    ? systemPreferences.getUserDefault('AppleActionOnDoubleClick', 'string')
    : null;
}

/**
 * Answers a title-bar double-click on the focused window, honouring the person's macOS preference.
 *
 * @summary The renderer can report that a person double-clicked the title bar but cannot zoom the
 * window itself, so the main process reads AppleActionOnDoubleClick and performs it here on whichever
 * window has focus. Off macOS the platform's own title bar already answers, so there is nothing to
 * read and nothing to do.
 */
export function answerTitleBarDoubleClick(platform: NodeJS.Platform): void {
  performTitleBarDoubleClick(
    BrowserWindow.getFocusedWindow() ?? undefined,
    doubleClickPreference(platform),
  );
}

/**
 * Moves the window controls to the band they now sit over, on platforms the renderer places them on.
 *
 * @summary Only macOS lets the renderer position the controls, so the move is a no-op elsewhere
 * rather than a call to a method that platform does not have.
 */
export function placeWindowButtons(
  platform: NodeJS.Platform,
  position: { x: number; y: number },
): void {
  if (!windowButtonsMoveOn(platform)) {
    return;
  }

  BrowserWindow.getAllWindows()[0]?.setWindowButtonPosition(position);
}

/**
 * Repaints the caption strip Windows draws, on the platforms that draw one.
 *
 * @summary Windows takes the strip colors once at construction and holds them until they are set
 * again, so a scheme that turns while the window stands leaves light buttons on a dark bar unless
 * this runs. `setTitleBarOverlay` exists on no other platform, so elsewhere there is nothing to
 * repaint rather than a method to call.
 */
export function paintTitleBarOverlay(platform: NodeJS.Platform, scheme: WindowScheme): void {
  if (!titleBarOverlayPaintsOn(platform)) {
    return;
  }

  BrowserWindow.getAllWindows()[0]?.setTitleBarOverlay(titleBarOverlayFor(scheme));
}
