import type { GatewayConfig } from '@recompose/contracts';

import { enforcedApiKey, routableGatewayOrigin } from '@recompose/contracts';

import type { ConnectFacts } from './connect-facts';

/**
 * The facts a client's instructions are written from, read off a stored gateway.
 *
 * @summary Every surface that points a harness at a gateway reads them here, so a moved port or a
 * replaced key reaches every printed instruction with no second place to update. The canvas sheet
 * and the setup step both stand on it, and neither carries its own idea of what a gateway offers.
 */
export function connectFactsFor(gateway: GatewayConfig, bindAddress: string): ConnectFacts {
  return {
    gatewayName: gateway.displayName,
    slug: gateway.slug,
    baseUrl: routableGatewayOrigin(bindAddress, gateway.port),
    apiKey: enforcedApiKey(gateway),
    models: gateway.virtualModels.map(({ id, displayName }) => ({ id, displayName })),
  };
}
