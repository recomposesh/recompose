import { loopbackOverrideOrNull } from '@recompose/contracts';

export { loopbackOverrideOrNull };

/**
 * Where a vendor's control-plane call lands: the token endpoint and the profile lookup.
 *
 * @summary These carry no target origin the way a served turn does, because they name the vendor's
 * own host rather than the account's. A scenario that renews or names an account offline needs the
 * same loopback stand-in the probe and runtime origins already honor, and the path is kept so one
 * stand-in answers every vendor at the route each of them asks under.
 */
export function controlPlaneUrl(vendorUrl: string): string {
  const standIn = loopbackOverrideOrNull(
    'RECOMPOSE_CONTROL_ORIGIN',
    process.env['RECOMPOSE_CONTROL_ORIGIN'],
  );

  return standIn === null ? vendorUrl : new URL(new URL(vendorUrl).pathname, standIn).toString();
}
