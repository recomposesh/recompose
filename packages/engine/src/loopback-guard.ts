import type { MiddlewareHandler } from 'hono';

import { DEFAULT_GATEWAY_BIND_ADDRESS } from '@recompose/contracts';

import { turnedAway } from './gateway-turned-away';
import { nonLoopbackClient, requestCarriesOrigin } from './refusals';

const LOOPBACK_ADDRESSES = ['127.0.0.1', 'localhost', '[::1]'];

export function guardLoopback(
  port: number,
  bindAddress = DEFAULT_GATEWAY_BIND_ADDRESS,
): MiddlewareHandler {
  const ownAddresses = new Set(LOOPBACK_ADDRESSES.map((address) => `${address}:${port}`));

  return async (c, next) => {
    if (
      bindAddress === DEFAULT_GATEWAY_BIND_ADDRESS &&
      !ownAddresses.has(new URL(c.req.url).host)
    ) {
      return turnedAway(c, nonLoopbackClient(), 403);
    }

    if (c.req.header('origin') !== undefined) {
      return turnedAway(c, requestCarriesOrigin(), 403);
    }

    return next();
  };
}
