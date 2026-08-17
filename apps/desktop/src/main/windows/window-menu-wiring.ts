import { BrowserWindow } from 'electron';

import type { AppMenuConduct } from '../menu/app-menu-conductor';

import { guardWindowShortcuts } from './window-shortcut-guard';

/**
 * Wires one created window into the menu conductor and the shortcut guard.
 *
 * @summary Both navigation events feed the same stand, because the first load arrives as
 * did-navigate while hash moves arrive in-page. The closed hook stands the menu nowhere only once
 * the last window goes, so no route-scoped item survives to push a command into the void.
 */
export function wireWindowIntoMenu(
  window: BrowserWindow,
  appMenu: AppMenuConduct,
  run: 'development' | 'packaged',
): void {
  guardWindowShortcuts(window, run);
  window.webContents.on('did-navigate-in-page', (_navigation, url) => {
    appMenu.standOnUrl(url);
  });
  window.webContents.on('did-navigate', (_navigation, url) => {
    appMenu.standOnUrl(url);
  });
  window.on('closed', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      appMenu.standNowhere();
    }
  });
}
