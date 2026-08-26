import { revealLabelFor } from '@recompose/contracts';

import type { AppMenuHandlers, AppMenuItem, AppMenuView } from './app-menu-item';

import { fileBrowserFor } from '../system/file-browser';
import { checkForUpdatesItem } from './update-menu-item';

function offMacTail(handlers: AppMenuHandlers, view: AppMenuView): AppMenuItem[] {
  return [{ type: 'separator' }, ...checkForUpdatesItem(handlers, view), { role: 'about' }];
}

function helpTail(
  platform: NodeJS.Platform,
  handlers: AppMenuHandlers,
  view: AppMenuView,
): AppMenuItem[] {
  return platform === 'darwin' ? [] : offMacTail(handlers, view);
}

/**
 * The Help menu trailing the bar on every platform and route.
 *
 * @summary On macOS the system `help` role is what stands the search field in it, and the role
 * prints no accelerator on the top-level item. The config-folder item speaks the settings row's
 * own reveal words through the one contracts table, and off macOS the menu ends with the update
 * check and the About item because no other menu carries either there.
 */
export function helpMenu(
  platform: NodeJS.Platform,
  handlers: AppMenuHandlers,
  view: AppMenuView,
): AppMenuItem {
  return {
    label: 'Help',
    ...(platform === 'darwin' ? { role: 'help' } : {}),
    submenu: [
      { label: 'Recompose Help', click: handlers.onOpenHelpSite },
      { label: revealLabelFor(fileBrowserFor(platform)), click: handlers.onOpenConfigFolder },
      { label: 'Report an Issue…', click: handlers.onReportIssue },
      ...helpTail(platform, handlers, view),
    ],
  };
}
