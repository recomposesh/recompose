import type { GatewayConfig } from '@recompose/contracts';

/** Where in a routing a card or cable seats, read out of the seat name it was built from. */
export type SeatReading = { modelId: string; routeNodeId?: string | undefined };

/**
 * The virtual model and the route node one seat name holds, which is the inverse of `seatName`.
 *
 * @summary A card standing for the entry keeps the bare definition id it stood under before
 * routers existed, and every card below the entry adds the id its ladder holds it by. A model id
 * is lowercase letters, digits, dots and dashes, so the last colon is the only place the two parts
 * can ever meet and reading back from it can never mistake one for the other.
 */
function seatRead(name: string): SeatReading {
  const split = name.lastIndexOf(':');

  return split === -1
    ? { modelId: name, routeNodeId: undefined }
    : { modelId: name.slice(0, split), routeNodeId: name.slice(split + 1) };
}

/**
 * The seat one prefixed card or cable id names, or nothing where it wears none of the prefixes.
 *
 * @summary Every id on this canvas is a prefix and a seat name, so one reader serves the cards,
 * the cables, and the subjects rather than three that drift on what a colon means.
 */
export function seatUnder(prefixes: readonly string[], id: string): SeatReading | undefined {
  const worn = prefixes.find((prefix) => id.startsWith(prefix));

  return worn === undefined ? undefined : seatRead(id.slice(worn.length));
}

/** The stored route node a seat names, or nothing where the definition or the node is gone. */
export function routeNodeIn(gateway: GatewayConfig, seat: SeatReading | undefined) {
  const held = gateway.virtualModels.find((model) => model.id === seat?.modelId);

  if (held === undefined) {
    return undefined;
  }

  return held.routing.nodes[seat?.routeNodeId ?? held.routing.entry];
}

/**
 * The seat name one reading writes back, which is the inverse of `seatRead`.
 *
 * @summary The pair lives side by side on purpose: a change to how a card is named has to move
 * both, and reading a name back and writing it out again is what proves it did.
 */
export function seatWritten(seat: SeatReading): string {
  return seat.routeNodeId === undefined ? seat.modelId : `${seat.modelId}:${seat.routeNodeId}`;
}
