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

  console.error(`recompose ignored ${variable}, because it does not name a loopback host.`);

  return null;
}
