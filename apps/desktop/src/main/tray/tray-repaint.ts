import type { EngineStates } from '@recompose/contracts';

import { listGatewayConfigs } from '../storage/gateway-store';
import { refreshMenuBarTray } from './menu-bar-tray';

/**
 * Repaints the tray from the stored gateways and one lifecycle snapshot.
 *
 * @summary The gateways are re-read on every repaint rather than cached, because the tray is the
 * one surface that outlives every window and must never show a gateway the disk no longer holds.
 */
export function trayRepainter(
  gatewaysDir: () => string,
  onCorrupt: (quarantinedPath: string) => void,
): (states: EngineStates) => void {
  return (states) => {
    listGatewayConfigs(gatewaysDir(), onCorrupt)
      .then((stored) => {
        refreshMenuBarTray(
          stored.map((gateway) => ({ slug: gateway.slug, displayName: gateway.displayName })),
          states,
        );
      })
      .catch((error: unknown) => {
        console.error('recompose could not read its gateways for the menu bar', error);
      });
  };
}
