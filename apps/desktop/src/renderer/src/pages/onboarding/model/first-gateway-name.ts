/** What setup calls the gateway it opens, before anything on disk has a say. */
export const FIRST_GATEWAY_NAME = 'My Gateway';

/**
 * The name setup's gateway takes over a machine that already holds one.
 *
 * @summary Setup is the first session's path, but the View menu opens it again on a machine with
 * gateways already stored, and the save refuses a name another gateway holds. Counting up from the
 * plain name beats refusing a person who asked for nothing unusual.
 */
export function freeGatewayName(taken: ReadonlySet<string>, wanted = FIRST_GATEWAY_NAME): string {
  if (!taken.has(wanted)) {
    return wanted;
  }

  let next = 2;

  while (taken.has(`${wanted} ${String(next)}`)) {
    next += 1;
  }

  return `${wanted} ${String(next)}`;
}
