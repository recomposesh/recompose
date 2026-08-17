import type { BrowserWindow } from 'electron';

import { optimizer } from '@electron-toolkit/utils';

/**
 * Wires the development window shortcuts, and wires nothing at all in a packaged run.
 *
 * @summary The toolkit's packaged branch exists to eat the reload and devtools chords, and this
 * application prints both on the View menu, so a packaged run attaches no before-input-event
 * listener and the printed keystrokes live by construction. The development run delegates to the
 * toolkit, whose development branch wires F12 and blocks nothing, with the zoom chords exempt.
 */
export function guardWindowShortcuts(window: BrowserWindow, run: 'development' | 'packaged'): void {
  if (run === 'development') {
    optimizer.watchWindowShortcuts(window, { zoom: true });
  }
}
