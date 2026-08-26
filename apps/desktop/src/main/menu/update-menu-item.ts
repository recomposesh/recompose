import type { AppMenuHandlers, AppMenuItem, AppMenuView } from './app-menu-item';

/**
 * The update check, wherever the platform stands it.
 *
 * @summary It answers with a run of items rather than one, so an install another tool updates
 * drops out of the menu without leaving the separator that framed it behind (record 0200).
 */
export function checkForUpdatesItem(handlers: AppMenuHandlers, view: AppMenuView): AppMenuItem[] {
  if (view.updateCheck === 'none') {
    return [];
  }

  return [
    {
      label: 'Check for Updates…',
      enabled: view.updateCheck !== 'asking',
      click: handlers.onCheckForUpdates,
    },
  ];
}
