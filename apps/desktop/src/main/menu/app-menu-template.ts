import type { IpcEventPayload } from '@recompose/contracts';
import type { MenuItemConstructorOptions } from 'electron';

export type AppMenuItem = {
  label?: string;
  role?: NonNullable<MenuItemConstructorOptions['role']>;
  accelerator?: string;
  type?: 'separator' | 'checkbox';
  checked?: boolean;
  click?: () => void;
  submenu?: AppMenuItem[];
};

export type AppMenuHandlers = {
  onOpenSettings: () => void;
  onNewGateway: () => void;
  onToggleChecklist: (shown: boolean) => void;
  onCanvasCommand: (command: IpcEventPayload<'canvas:command'>) => void;
};

export type AppMenuView = {
  checklistShown: boolean;
  onGatewayDetail: boolean;
};

function settingsItem(handlers: AppMenuHandlers): AppMenuItem {
  return { label: 'Settings…', accelerator: 'CmdOrCtrl+,', click: handlers.onOpenSettings };
}

function newGatewayItem(handlers: AppMenuHandlers): AppMenuItem {
  return { label: 'New Gateway…', accelerator: 'CmdOrCtrl+N', click: handlers.onNewGateway };
}

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

function viewMenu(
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

function canvasCommandClick(
  handlers: AppMenuHandlers,
  command: IpcEventPayload<'canvas:command'>,
): () => void {
  return () => {
    handlers.onCanvasCommand(command);
  };
}

function gatewayMenu(handlers: AppMenuHandlers): AppMenuItem {
  return {
    label: 'Gateway',
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
    ...(view.onGatewayDetail ? [gatewayMenu(handlers)] : []),
    { role: 'windowMenu' },
  ];
}
