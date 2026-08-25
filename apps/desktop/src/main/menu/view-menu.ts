import type { AppMenuHandlers, AppMenuItem, AppMenuView } from './app-menu-item';

function checklistToggleItem(handlers: AppMenuHandlers, view: AppMenuView): AppMenuItem {
  return {
    label: 'Show Onboarding Checklist',
    type: 'checkbox',
    checked: view.checklistShown,
    click: () => {
      handlers.onToggleChecklist(!view.checklistShown);
    },
  };
}

/**
 * @summary Reopening shows the surface again and resets nothing, which is why it reads as opening
 * rather than as starting over. It stands beside the checklist toggle because both show a way
 * through the same first session, and it stands down while the wizard is already up.
 */
function openSetupItem(handlers: AppMenuHandlers, view: AppMenuView): AppMenuItem {
  return {
    label: 'Open Setup',
    enabled: !view.setupStanding,
    click: handlers.onOpenSetup,
  };
}

function navigationItems(handlers: AppMenuHandlers, view: AppMenuView): AppMenuItem[] {
  const onGateways = !view.onProviders && !view.onUsage;

  return [
    {
      label: 'Gateways',
      accelerator: 'CmdOrCtrl+1',
      type: 'radio',
      checked: onGateways,
      click: handlers.onOpenGateways,
    },
    {
      label: 'Providers',
      accelerator: 'CmdOrCtrl+2',
      type: 'radio',
      checked: view.onProviders,
      click: handlers.onOpenProviders,
    },
    {
      label: 'Usage',
      accelerator: 'CmdOrCtrl+3',
      type: 'radio',
      checked: view.onUsage,
      click: handlers.onOpenUsage,
    },
  ];
}

function surfaceToggleItems(handlers: AppMenuHandlers, view: AppMenuView): AppMenuItem[] {
  return [
    {
      label: 'Show Sidebar',
      accelerator: 'CmdOrCtrl+B',
      type: 'checkbox',
      checked: view.windowStanding && view.sidebarShown,
      enabled: view.windowStanding,
      click: () => {
        handlers.onViewCommand('toggle-sidebar');
      },
    },
    {
      label: 'Show Inspector',
      accelerator: 'Alt+CmdOrCtrl+B',
      type: 'checkbox',
      checked: view.windowStanding && view.inspectorOpen,
      enabled: view.windowStanding && view.onGatewayDetail,
      click: () => {
        handlers.onViewCommand('toggle-inspector');
      },
    },
  ];
}

function reloadRows(view: AppMenuView): AppMenuItem[] {
  if (!view.development) {
    return [{ role: 'reload' }];
  }

  return [{ role: 'reload' }, { role: 'forceReload' }, { role: 'toggleDevTools' }];
}

export function viewMenu(
  _platform: NodeJS.Platform,
  handlers: AppMenuHandlers,
  view: AppMenuView,
): AppMenuItem {
  return {
    label: 'View',
    submenu: [
      ...navigationItems(handlers, view),
      { type: 'separator' },
      ...surfaceToggleItems(handlers, view),
      checklistToggleItem(handlers, view),
      openSetupItem(handlers, view),
      { type: 'separator' },
      ...reloadRows(view),
      { type: 'separator' },
      { role: 'togglefullscreen' },
    ],
  };
}
