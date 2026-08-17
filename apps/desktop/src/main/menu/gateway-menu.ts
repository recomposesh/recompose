import type { IpcEventPayload } from '@recompose/contracts';

import type { AppMenuHandlers, AppMenuItem, AppMenuView } from './app-menu-item';

import { lifecycleAvailabilityFor } from '../tray/gateway-lifecycle-submenu';

function canvasCommandClick(
  handlers: AppMenuHandlers,
  command: IpcEventPayload<'canvas:command'>,
): () => void {
  return () => {
    handlers.onCanvasCommand(command);
  };
}

function lifecycleItems(handlers: AppMenuHandlers, view: AppMenuView): AppMenuItem[] {
  const slug = view.standingGatewaySlug ?? '';
  const availability = lifecycleAvailabilityFor(view.gatewayServing);

  return [
    {
      label: 'Start Gateway',
      accelerator: 'CmdOrCtrl+Return',
      enabled: availability.start,
      click: () => {
        handlers.onStartGateway(slug);
      },
    },
    {
      label: 'Stop Gateway',
      accelerator: 'CmdOrCtrl+.',
      enabled: availability.stop,
      click: () => {
        handlers.onStopGateway(slug);
      },
    },
    {
      label: 'Restart Gateway',
      accelerator: 'Shift+CmdOrCtrl+Return',
      enabled: availability.restart,
      click: () => {
        handlers.onRestartGateway(slug);
      },
    },
  ];
}

function zoomItems(handlers: AppMenuHandlers): AppMenuItem[] {
  return [
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
      label: 'Actual Size',
      accelerator: 'CmdOrCtrl+0',
      click: canvasCommandClick(handlers, 'zoom-to-100'),
    },
    {
      label: 'Zoom to Fit',
      accelerator: 'Shift+CmdOrCtrl+0',
      click: canvasCommandClick(handlers, 'zoom-to-fit'),
    },
  ];
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

/**
 * The Gateway menu driving the standing gateway.
 *
 * @summary The lifecycle group reads the one availability law the tray reads, so the two surfaces
 * can't drift. While a question stands over the window the whole menu renders unavailable, so an
 * armed accelerator never acts behind it.
 */
export function gatewayMenu(handlers: AppMenuHandlers, view: AppMenuView): AppMenuItem {
  return {
    label: 'Gateway',
    enabled: !view.modalStanding,
    submenu: [
      ...lifecycleItems(handlers, view),
      { type: 'separator' },
      { label: 'Copy Base URL', click: canvasCommandClick(handlers, 'copy-base-url') },
      { type: 'separator' },
      ...zoomItems(handlers),
      { type: 'separator' },
      {
        label: 'Tidy Up',
        accelerator: 'Alt+CmdOrCtrl+T',
        click: canvasCommandClick(handlers, 'tidy'),
      },
      { type: 'separator' },
      showLogsItem(handlers, view),
      { type: 'separator' },
      { label: 'Delete Gateway', click: canvasCommandClick(handlers, 'remove-gateway') },
    ],
  };
}
