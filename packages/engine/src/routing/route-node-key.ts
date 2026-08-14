export type RouteNodeAddress = { slug: string; virtualModel: string; routeNode: string };

/**
 * The one key every piece of runtime memory files a route node under.
 *
 * @summary Cooling and rotation both key by gateway, virtual model, and route node, never by the
 * client's model alias, so two virtual models standing over the same shape never share a turn or
 * inherit each other's cooling. The three names are encoded rather than joined, so a slug that reads
 * like another slug run together with a model name cannot collide with it.
 */
export function routeNodeKey(address: RouteNodeAddress): string {
  return JSON.stringify([address.slug, address.virtualModel, address.routeNode]);
}
