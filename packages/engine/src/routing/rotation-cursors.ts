import type { RouteNodeAddress } from './route-node-key';

import { routeNodeKey } from './route-node-key';

export type RotationCursors = {
  cursorAt: (address: RouteNodeAddress) => number;
  advanceTo: (address: RouteNodeAddress, cursor: number) => void;
};

/**
 * The turn each round-robin router last handed on.
 *
 * @summary A turn outlives the request that took it, because spreading requests evenly is a fact
 * about a sequence of requests rather than about one. It never outlives the process, so a restart
 * costs one uneven request and owes nothing to disk.
 */
export function createRotationCursors(): RotationCursors {
  const turns = new Map<string, number>();

  return {
    cursorAt: (address) => turns.get(routeNodeKey(address)) ?? 0,
    advanceTo: (address, cursor) => {
      turns.set(routeNodeKey(address), cursor);
    },
  };
}
