import type { EngineStates } from '@recompose/contracts';
import type { MenuItemConstructorOptions } from 'electron';

import type {
  GatewayLifecycleHandlers,
  TrayGateway,
  TrayMenuItem,
} from '../tray/gateway-lifecycle-submenu';

import { gatewayLifecycleSubmenu } from '../tray/gateway-lifecycle-submenu';

export type DockMenuHandlers = GatewayLifecycleHandlers & {
  onNewGateway: () => void;
  onOpenSettings: () => void;
};

export type DockMenuSeams = {
  listGateways: () => Promise<readonly TrayGateway[]>;
  setMenu: (template: TrayMenuItem[]) => void;
  handlers: DockMenuHandlers;
};

/**
 * Whether this run owns a Dock tile to hang a menu on.
 *
 * @summary Only darwin has a Dock, and an accessory run gave its tile away on purpose, so both
 * skips are one typed decision rather than a caught throw.
 */
export function dockStands(
  platform: NodeJS.Platform,
  activationPolicy: 'accessory' | null,
): boolean {
  return platform === 'darwin' && activationPolicy === null;
}

function gatewaySection(
  gateways: readonly TrayGateway[],
  states: EngineStates,
  handlers: DockMenuHandlers,
): TrayMenuItem[] {
  if (gateways.length === 0) {
    return [{ label: 'No gateways yet', enabled: false }];
  }

  return gateways.map((gateway) => ({
    label: gateway.displayName,
    submenu: gatewayLifecycleSubmenu(gateway, states, handlers),
  }));
}

/**
 * The Dock menu mirroring the tray, which is the fallback surface when the menu bar extra hides.
 */
export function buildDockMenuTemplate(
  gateways: readonly TrayGateway[],
  states: EngineStates,
  handlers: DockMenuHandlers,
): TrayMenuItem[] {
  return [
    ...gatewaySection(gateways, states, handlers),
    { type: 'separator' },
    { label: 'New Gateway…', click: handlers.onNewGateway },
    { label: 'Settings…', click: handlers.onOpenSettings },
  ];
}

export function asDockElectronMenu(items: TrayMenuItem[]): MenuItemConstructorOptions[] {
  return items.map(({ icon: _icon, submenu, ...rest }) => ({
    ...rest,
    ...(submenu === undefined ? {} : { submenu: asDockElectronMenu(submenu) }),
  }));
}

/**
 * Repaints the Dock menu from the stored gateways and one lifecycle snapshot.
 *
 * @summary Every change hands a freshly built template to the seam rather than mutating an
 * installed menu, and the gateways are re-read on every repaint so the Dock never shows a gateway
 * the disk no longer holds. A failed read keeps the standing menu, mirroring the tray repainter.
 */
export function dockRepainter(seams: DockMenuSeams): (states: EngineStates) => void {
  return (states) => {
    seams
      .listGateways()
      .then((gateways) => {
        seams.setMenu(buildDockMenuTemplate(gateways, states, seams.handlers));
      })
      .catch((error: unknown) => {
        console.error('recompose could not read its gateways for the Dock menu', error);
      });
  };
}
