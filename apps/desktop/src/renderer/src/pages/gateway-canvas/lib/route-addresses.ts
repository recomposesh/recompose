import type { GatewayConfig } from '@recompose/contracts';

/** Where in a routing a card or cable stands, read out of the name it was built from. */
export type RouteAddress = { modelId: string; routeNodeId?: string | undefined };

/**
 * The virtual model and the route node one name holds, which is the inverse of `addressWritten`.
 *
 * @summary A card standing for the entry keeps the bare definition id it stood under before
 * routers existed, and every card below the entry adds the id its ladder holds it by. Only the
 * first half is colon-free: `modelAliasSchema` admits lowercase letters, digits, dots and dashes,
 * while a route node id carries whatever minted it, and the version 4 migration mints `seat:` plus
 * the model's own id. So the first colon is the only boundary that can be trusted, and reading
 * from the last one would tear a migrated id in half once a router displaced it below the entry.
 */
function addressRead(name: string): RouteAddress {
  const split = name.indexOf(':');

  return split === -1
    ? { modelId: name, routeNodeId: undefined }
    : { modelId: name.slice(0, split), routeNodeId: name.slice(split + 1) };
}

/**
 * The address one prefixed card or cable id names, or nothing where it wears none of the prefixes.
 *
 * @summary Every id on this canvas is a prefix and an address, so one reader serves the cards,
 * the cables, and the subjects rather than three that drift on what a colon means.
 */
export function addressUnder(prefixes: readonly string[], id: string): RouteAddress | undefined {
  const worn = prefixes.find((prefix) => id.startsWith(prefix));

  return worn === undefined ? undefined : addressRead(id.slice(worn.length));
}

/** The stored route node an address names, or nothing where the definition or the node is gone. */
export function routeNodeIn(gateway: GatewayConfig, address: RouteAddress | undefined) {
  const held = gateway.virtualModels.find((model) => model.id === address?.modelId);

  if (held === undefined) {
    return undefined;
  }

  return held.routing.nodes[address?.routeNodeId ?? held.routing.entry];
}

/**
 * The name one address writes back, which is the inverse of `addressRead`.
 *
 * @summary The one writer of an address on this canvas, so a card id, a cable id, and the id a
 * pick commits under all join their two parts the same way. The pair lives side by side on purpose:
 * a change to how a card is named has to move both, and reading a name back and writing it out
 * again is what proves it did.
 */
export function addressWritten(address: RouteAddress): string {
  return address.routeNodeId === undefined
    ? address.modelId
    : `${address.modelId}:${address.routeNodeId}`;
}

/**
 * What names one route node's card apart from every other on the canvas.
 *
 * @summary A virtual model reaches exactly one entry, so the entry answers in the model's own name
 * and every card a gateway stood before routers existed keeps the id it stood under. A node below
 * the entry adds the id its ladder holds it by, which is what lets one model stand several targets
 * without two cards colliding. A cable reads the same rule for the router it leaves, so a parent
 * and its child never disagree about the card standing between them.
 */
export function addressName(modelId: string, routeNodeId: string, entry: string): string {
  return addressWritten({
    modelId,
    routeNodeId: routeNodeId === entry ? undefined : routeNodeId,
  });
}
