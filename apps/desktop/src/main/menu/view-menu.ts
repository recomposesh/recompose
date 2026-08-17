import type { AppMenuHandlers, AppMenuItem, AppMenuView } from './app-menu-item';

export function checklistToggleItem(handlers: AppMenuHandlers, view: AppMenuView): AppMenuItem {
  return {
    label: 'Show Onboarding Checklist',
    type: 'checkbox',
    checked: view.checklistShown,
    click: () => {
      handlers.onToggleChecklist(!view.checklistShown);
    },
  };
}

export function viewMenu(
  platform: NodeJS.Platform,
  handlers: AppMenuHandlers,
  view: AppMenuView,
): AppMenuItem {
  const head =
    platform === 'darwin'
      ? []
      : [checklistToggleItem(handlers, view), { type: 'separator' } as const];

  return {
    label: 'View',
    submenu: [
      ...head,
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'togglefullscreen' },
    ],
  };
}
