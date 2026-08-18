import type { GatewayConfig } from '@recompose/contracts';

import { routableGatewayOrigin } from '@recompose/contracts';

/**
 * The one printed form of a gateway's base address.
 *
 * @summary The endpoint box, the connect sheet, and the menu-driven copy all speak this call, so
 * a moved port or bind address reaches every printed address with no second place to update.
 */
export function gatewayBaseUrl(gateway: GatewayConfig, bindAddress: string): string {
  return routableGatewayOrigin(bindAddress, gateway.port);
}
