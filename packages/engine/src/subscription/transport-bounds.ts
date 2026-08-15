import type { WreqInit } from 'node-wreq';

import { proxyFetchBoundMs } from '@recompose/contracts';

import { providerSilenceBoundMs } from '../provider-bounds';

/**
 * The two bounds a subscription turn travels under, stated rather than inherited.
 *
 * @summary Measured on Electron's Node, `node-wreq` gives a whole request 30 seconds by default, and
 * that ceiling cuts an answer still arriving: a stream fed a byte every ten seconds died at 30.0
 * seconds. It fires long before the gateway's own 240-second first-event bound, so the latch never
 * got to name the target. `readTimeout` alone can't lift it, because the total wins, so the total
 * carries `proxyFetchBoundMs` and the gap carries the same silence bound the credentialed transport
 * uses. The vendor headers already claimed ten minutes while the socket allowed thirty seconds.
 *
 * They ride on the provider turn rather than on the shared transport options, because a token
 * refresh is not a streamed answer and already carries a bound of its own.
 */
export const subscriptionBounds: Pick<WreqInit, 'readTimeout' | 'timeout'> = {
  timeout: proxyFetchBoundMs,
  readTimeout: providerSilenceBoundMs,
};
