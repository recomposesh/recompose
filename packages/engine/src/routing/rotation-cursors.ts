import type { RouteNodeAddress } from './route-node-key';

import { routeNodeKey } from './route-node-key';

/** One turn a descent took: where the router stood before it, and where it moved the router to. */
export type TurnTaken = { was: number; cursor: number };

export type RotationCursors = {
  cursorAt: (address: RouteNodeAddress) => number;
  advanceTo: (address: RouteNodeAddress, cursor: number) => void;
  handBack: (address: RouteNodeAddress, turn: TurnTaken) => void;
};

/**
 * The turn each round-robin router last handed on.
 *
 * @summary A turn outlives the request that took it, because spreading requests evenly is a fact
 * about a sequence of requests rather than about one. It never outlives the process, so a restart
 * costs one uneven request and owes nothing to disk.
 *
 * A turn comes back only while the router still stands where the descent left it. Requests arrive
 * together and a judge call parks one of them mid-descent, so a hand-back that wrote the old number
 * back whatever had happened since would undo a turn the walk beside it took and send both requests
 * to the same child.
 */
export function createRotationCursors(): RotationCursors {
  const turns = new Map<string, number>();

  return {
    cursorAt: (address) => turns.get(routeNodeKey(address)) ?? 0,
    advanceTo: (address, cursor) => {
      turns.set(routeNodeKey(address), cursor);
    },
    handBack: (address, turn) => {
      const key = routeNodeKey(address);

      if (turns.get(key) === turn.cursor) turns.set(key, turn.was);
    },
  };
}
