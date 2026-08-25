import { loopbackOverrideOrNull } from '@recompose/contracts';

/**
 * Where a price lookup lands, which is the vendor unless a scenario stood one on this machine.
 *
 * @summary The price map and the model registry both refresh on boot, so without this every
 * end-to-end scenario reaches two vendor hosts before it does anything a person asked for. The path
 * survives the redirect, so one stand-in answers both at the route each of them asks under, and a
 * value naming anything but loopback is refused rather than honored.
 */
export function priceAddressBehindTheStandIn(vendorUrl: string): string {
  const standIn = loopbackOverrideOrNull(
    'RECOMPOSE_PRICE_ORIGIN',
    process.env['RECOMPOSE_PRICE_ORIGIN'],
  );

  return standIn === null ? vendorUrl : new URL(new URL(vendorUrl).pathname, standIn).toString();
}
