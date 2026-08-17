import type { IpcEventPayload } from '@recompose/contracts';

import type { AppMenuHandlers, AppMenuItem, AppMenuView } from './app-menu-item';

function usageCommandClick(
  handlers: AppMenuHandlers,
  command: IpcEventPayload<'usage:command'>,
): () => void {
  return () => {
    handlers.onUsageCommand(command);
  };
}

function metricSubmenu(handlers: AppMenuHandlers): AppMenuItem {
  return {
    label: 'Metric',
    submenu: [
      { label: 'Requests', click: usageCommandClick(handlers, 'metric-requests') },
      { label: 'Latency', click: usageCommandClick(handlers, 'metric-latency') },
      { label: 'Tokens', click: usageCommandClick(handlers, 'metric-tokens') },
      { label: 'Spend', click: usageCommandClick(handlers, 'metric-spend') },
    ],
  };
}

export function usageMenu(handlers: AppMenuHandlers, view: AppMenuView): AppMenuItem {
  return {
    label: 'Usage',
    submenu: [
      {
        label: 'Last 24 Hours',
        accelerator: 'CmdOrCtrl+1',
        click: usageCommandClick(handlers, 'range-24h'),
      },
      {
        label: 'Last 7 Days',
        accelerator: 'CmdOrCtrl+2',
        click: usageCommandClick(handlers, 'range-7d'),
      },
      {
        label: 'Last 30 Days',
        accelerator: 'CmdOrCtrl+3',
        click: usageCommandClick(handlers, 'range-30d'),
      },
      { type: 'separator' },
      metricSubmenu(handlers),
      { type: 'separator' },
      {
        label: 'Show Data Table',
        accelerator: 'CmdOrCtrl+Shift+T',
        type: 'checkbox',
        checked: view.usageTableOpen,
        click: usageCommandClick(handlers, 'toggle-table-twin'),
      },
      { type: 'separator' },
      {
        label: 'Refresh Usage',
        accelerator: 'CmdOrCtrl+Shift+R',
        click: usageCommandClick(handlers, 'refresh'),
      },
    ],
  };
}
