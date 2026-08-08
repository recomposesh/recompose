import type { IpcEventPayload } from '@recompose/contracts';
import type { MenuItemConstructorOptions } from 'electron';

export type AppMenuItem = {
  label?: string;
  role?: NonNullable<MenuItemConstructorOptions['role']>;
  accelerator?: string;
  type?: 'separator';
  click?: () => void;
  submenu?: AppMenuItem[];
};

export type AppMenuHandlers = {
  onOpenSettings: () => void;
  onNewGateway: () => void;
  onShowGetStarted: () => void;
  onCanvasCommand: (command: IpcEventPayload<'canvas:command'>) => void;
};

function settingsItem(handlers: AppMenuHandlers): AppMenuItem {
  return { label: 'Settings…', accelerator: 'CmdOrCtrl+,', click: handlers.onOpenSettings };
}

function newGatewayItem(handlers: AppMenuHandlers): AppMenuItem {
  return { label: 'New Gateway…', accelerator: 'CmdOrCtrl+N', click: handlers.onNewGateway };
}

function macApplicationMenu(handlers: AppMenuHandlers): AppMenuItem {
  return {
    label: 'Recompose',
    submenu: [
      { role: 'about' },
      { type: 'separator' },
      settingsItem(handlers),
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

function viewMenu(handlers: AppMenuHandlers): AppMenuItem {
  return {
    label: 'View',
    submenu: [
      { label: 'Show Get Started', click: handlers.onShowGetStarted },
      { type: 'separator' },
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'togglefullscreen' },
    ],
  };
}

function canvasCommandClick(
  handlers: AppMenuHandlers,
  command: IpcEventPayload<'canvas:command'>,
): () => void {
  return () => {
    handlers.onCanvasCommand(command);
  };
}

function canvasMenu(handlers: AppMenuHandlers): AppMenuItem {
  return {
    label: 'Canvas',
    submenu: [
      {
        label: 'Zoom In',
        accelerator: 'CmdOrCtrl+=',
        click: canvasCommandClick(handlers, 'zoom-in'),
      },
      {
        label: 'Zoom Out',
        accelerator: 'CmdOrCtrl+-',
        click: canvasCommandClick(handlers, 'zoom-out'),
      },
      {
        label: 'Zoom to Fit',
        accelerator: 'CmdOrCtrl+0',
        click: canvasCommandClick(handlers, 'zoom-to-fit'),
      },
      { type: 'separator' },
      { label: 'Tidy', click: canvasCommandClick(handlers, 'tidy') },
    ],
  };
}

function leadingMenus(platform: NodeJS.Platform, handlers: AppMenuHandlers): AppMenuItem[] {
  if (platform === 'darwin') {
    return [macApplicationMenu(handlers), macFileMenu(handlers)];
  }

  return [fileMenu(handlers)];
}

export function buildAppMenuTemplate(
  platform: NodeJS.Platform,
  handlers: AppMenuHandlers,
): AppMenuItem[] {
  return [
    ...leadingMenus(platform, handlers),
    { role: 'editMenu' },
    viewMenu(handlers),
    canvasMenu(handlers),
    { role: 'windowMenu' },
  ];
}
