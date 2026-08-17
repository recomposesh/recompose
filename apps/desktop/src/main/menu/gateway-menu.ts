import type { IpcEventPayload } from '@recompose/contracts';

import type { AppMenuHandlers, AppMenuItem, AppMenuView } from './app-menu-item';

function canvasCommandClick(
  handlers: AppMenuHandlers,
  command: IpcEventPayload<'canvas:command'>,
): () => void {
  return () => {
    handlers.onCanvasCommand(command);
  };
}

function showLogsItem(handlers: AppMenuHandlers, view: AppMenuView): AppMenuItem {
  return {
    label: 'Show Logs',
    accelerator: 'CmdOrCtrl+Shift+L',
    type: 'checkbox',
    checked: view.logsDrawerOpen,
    click: canvasCommandClick(handlers, 'toggle-logs'),
  };
}

export function gatewayMenu(handlers: AppMenuHandlers, view: AppMenuView): AppMenuItem {
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
      { type: 'separator' },
      showLogsItem(handlers, view),
    ],
  };
}
