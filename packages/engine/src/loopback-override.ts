const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * An origin named in the environment to stand in for a vendor's host, or nothing.
 *
 * @summary A scenario driving the whole app has to reach the vendors somewhere it can watch.
 * Anything naming a host off this machine is refused rather than honored, so a variable a person
 * did not set cannot quietly send their credential somewhere else.
 */
export function loopbackOverrideOrNull(
  variable: string,
  override: string | undefined,
): string | null {
  if (override === undefined) {
    return null;
  }

  if (URL.canParse(override) && loopbackHosts.has(new URL(override).hostname)) {
    return override;
  }

  console.error(`The engine child ignored ${variable}, because it does not name a loopback host.`);

  return null;
}

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
