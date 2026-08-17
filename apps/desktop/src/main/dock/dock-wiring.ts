import type { EngineStates } from '@recompose/contracts';

import { app, Menu } from 'electron';

import type { GatewayLifecycleHandlers } from '../tray/gateway-lifecycle-submenu';

import { listGatewayConfigs } from '../storage/gateway-store';
import { asDockElectronMenu, dockRepainter, dockStands } from './dock-menu';

type DockMenuWiring = {
  platform: NodeJS.Platform;
  activationPolicy: 'accessory' | null;
  gatewaysDir: () => string;
  onCorrupt: (quarantinedPath: string) => void;
  lifecycle: GatewayLifecycleHandlers;
  onNewGateway: () => void;
  onOpenSettings: () => void;
};

/** The Dock repainter wired to the app's own seams, or nothing where no Dock stands. */
export function dockMenuWiring(wiring: DockMenuWiring): ((states: EngineStates) => void) | null {
  if (!dockStands(wiring.platform, wiring.activationPolicy)) {
    return null;
  }

  return dockRepainter({
    listGateways: async () => {
      const stored = await listGatewayConfigs(wiring.gatewaysDir(), wiring.onCorrupt);

      return stored.map((gateway) => ({ slug: gateway.slug, displayName: gateway.displayName }));
    },
    setMenu: (template) => {
      app.dock?.setMenu(Menu.buildFromTemplate(asDockElectronMenu(template)));
    },
    handlers: {
      onStartGateway: wiring.lifecycle.onStartGateway,
      onStopGateway: wiring.lifecycle.onStopGateway,
      onRestartGateway: wiring.lifecycle.onRestartGateway,
      onNewGateway: wiring.onNewGateway,
      onOpenSettings: wiring.onOpenSettings,
    },
  });
}
