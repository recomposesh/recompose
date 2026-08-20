import type { RouteNodeAddress } from './route-node-key';

import { routeNodeKey } from './route-node-key';

type Cooling = { coolUntilMs: number; retryAtMs?: number };

export type CooldownLedger = {
  cool: (address: RouteNodeAddress, cooling: Cooling) => void;
  coolingAt: (address: RouteNodeAddress) => Cooling | undefined;
};

export type TellCooling = (address: RouteNodeAddress, coolUntilMs: number) => void;

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
 *
 * Whoever is told a node stood down hears only the window, and hears it as the write happens rather
 * than by asking: a screen that had to poll would either miss a short stand-down whole or ask the
 * ledger a question every frame it drew.
 */
export function createCooldownLedger(
  now: () => number,
  told: TellCooling = () => undefined,
): CooldownLedger {
  const standingDown = new Map<string, Cooling>();

  return {
    cool: (address, cooling) => {
      standingDown.set(routeNodeKey(address), recorded(cooling));
      told(address, cooling.coolUntilMs);
    },
    coolingAt: (address) => {
      const cooling = standingDown.get(routeNodeKey(address));

      return cooling !== undefined && cooling.coolUntilMs > now() ? cooling : undefined;
    },
  };
}
