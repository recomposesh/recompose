import type { AppMenuHandlers, AppMenuItem, AppMenuView } from './app-menu-item';

import { gatewayMenu } from './gateway-menu';
import { usageMenu } from './usage-menu';
import { checklistToggleItem, viewMenu } from './view-menu';

export type { AppMenuHandlers, AppMenuItem, AppMenuView } from './app-menu-item';

function settingsItem(handlers: AppMenuHandlers): AppMenuItem {
  return { label: 'Settings…', accelerator: 'CmdOrCtrl+,', click: handlers.onOpenSettings };
}

function newGatewayItem(handlers: AppMenuHandlers): AppMenuItem {
  return { label: 'New Gateway…', accelerator: 'CmdOrCtrl+N', click: handlers.onNewGateway };
}

function macApplicationMenu(handlers: AppMenuHandlers, view: AppMenuView): AppMenuItem {
  return {
    label: 'Recompose',
    submenu: [
      { role: 'about' },
      { type: 'separator' },
      settingsItem(handlers),
      checklistToggleItem(handlers, view),
      { type: 'separator' },
      { role: 'services' },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideOthers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit' },
    ],
  };
}

function macFileMenu(handlers: AppMenuHandlers): AppMenuItem {
  return {
    label: 'File',
    submenu: [newGatewayItem(handlers), { type: 'separator' }, { role: 'close' }],
  };
}

function fileMenu(handlers: AppMenuHandlers): AppMenuItem {
  return {
    label: 'File',
    submenu: [
      newGatewayItem(handlers),
      { type: 'separator' },
      settingsItem(handlers),
      { type: 'separator' },
      { role: 'quit' },
    ],
  };
}

function leadingMenus(
  platform: NodeJS.Platform,
  handlers: AppMenuHandlers,
  view: AppMenuView,
): AppMenuItem[] {
  if (platform === 'darwin') {
    return [macApplicationMenu(handlers, view), macFileMenu(handlers)];
  }

  return [fileMenu(handlers)];
}

export function buildAppMenuTemplate(
  platform: NodeJS.Platform,
  handlers: AppMenuHandlers,
  view: AppMenuView,
): AppMenuItem[] {
  return [
    ...leadingMenus(platform, handlers, view),
    { role: 'editMenu' },
    viewMenu(platform, handlers, view),
    ...(view.onGatewayDetail ? [gatewayMenu(handlers, view)] : []),
    ...(view.onUsage ? [usageMenu(handlers, view)] : []),
    { role: 'windowMenu' },
  ];
}
