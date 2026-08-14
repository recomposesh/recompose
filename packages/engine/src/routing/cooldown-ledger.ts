import type { RouteNodeSeat } from './route-node-key';

import { routeNodeKey } from './route-node-key';

type Cooling = { coolUntilMs: number; retryAtMs?: number };

export type CooldownLedger = {
  cool: (seat: RouteNodeSeat, cooling: Cooling) => void;
  coolingAt: (seat: RouteNodeSeat) => Cooling | undefined;
};

function recorded(cooling: Cooling): Cooling {
  return cooling.retryAtMs === undefined
    ? { coolUntilMs: cooling.coolUntilMs }
    : { coolUntilMs: cooling.coolUntilMs, retryAtMs: cooling.retryAtMs };
}

/**
 * The memory of which children stand down, and until when.
 *
 * @summary The clock arrives injected so a spec can drive cooling forward without waiting for one.
 * A ledger holds nothing beyond the process that made it, which is the whole health model: the child
 * restarts and every child stands ready again, because a person's metered account is not a replica
 * whose health is worth reconstructing. A retry time the provider itself promised is remembered as
 * promised, so a refusal built later can tell a real rate limit from a guess.
 */
export function createCooldownLedger(now: () => number): CooldownLedger {
  const standingDown = new Map<string, Cooling>();

  return {
    cool: (seat, cooling) => {
      standingDown.set(routeNodeKey(seat), recorded(cooling));
    },
    coolingAt: (seat) => {
      const cooling = standingDown.get(routeNodeKey(seat));

      return cooling !== undefined && cooling.coolUntilMs > now() ? cooling : undefined;
    },
  };
}
