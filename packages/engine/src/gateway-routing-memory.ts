import type { CooldownLedger } from './routing/cooldown-ledger';
import type { RotationCursors } from './routing/rotation-cursors';
import type { RouteNodeAddress } from './routing/route-node-key';

import { createCooldownLedger } from './routing/cooldown-ledger';
import { createRotationCursors } from './routing/rotation-cursors';
import { routeNodeKey } from './routing/route-node-key';

export const PINNED_CONVERSATION_LIMIT = 500;

/**
 * How long a conversation may go quiet before its branch is forgotten.
 *
 * @summary The pin exists to keep a provider's prompt cache warm and a conversation's behavior
 * steady, and every vendor cache it protects expires within minutes of silence. Holding a decision
 * past that window buys no cache hit and only keeps a stale judgment alive, so the window sits just
 * above the shortest cache lifetime rather than as long as memory would allow.
 */
export const PIN_IDLE_MS = 600_000;

type Pinned = { child: string; touchedAtMs: number };

export type BranchPins = {
  pinnedAt: (address: RouteNodeAddress, fingerprint: string) => string | undefined;
  pin: (address: RouteNodeAddress, fingerprint: string, child: string) => void;
};

function pinKey(address: RouteNodeAddress, fingerprint: string): string {
  return JSON.stringify([routeNodeKey(address), fingerprint]);
}

function forgetPastTheBound(held: Map<string, Pinned>): void {
  for (const oldest of held.keys()) {
    if (held.size <= PINNED_CONVERSATION_LIMIT) return;

    held.delete(oldest);
  }
}

/**
 * The branch each conversation earned, per router, for as long as it keeps talking.
 *
 * @summary Two bounds hold it: a conversation that goes quiet is forgotten, and a gateway busier
 * than the store is wide forgets whichever conversation spoke longest ago. A desktop process runs
 * for weeks, so a map that only ever grew would spend a person's memory remembering routing
 * decisions for conversations that ended months earlier. Reading a pin counts as talking, which is
 * what lets a long conversation outlive the window while an abandoned one falls out of it.
 */
export function createBranchPins(now: () => number): BranchPins {
  const held = new Map<string, Pinned>();

  const keep = (key: string, child: string) => {
    held.delete(key);
    held.set(key, { child, touchedAtMs: now() });
  };

  return {
    pinnedAt: (address, fingerprint) => {
      const key = pinKey(address, fingerprint);
      const pinned = held.get(key);

      if (pinned === undefined) return undefined;

      if (now() - pinned.touchedAtMs > PIN_IDLE_MS) {
        held.delete(key);

        return undefined;
      }

      keep(key, pinned.child);

      return pinned.child;
    },
    pin: (address, fingerprint, child) => {
      keep(pinKey(address, fingerprint), child);
      forgetPastTheBound(held);
    },
  };
}

export type RoutingMemory = {
  ledger: CooldownLedger;
  cursors: RotationCursors;
  pins: BranchPins;
  now: () => number;
};

/**
 * What one gateway remembers between requests: which children stand down, whose turn is next, and
 * which branch each conversation earned.
 *
 * @summary The memory belongs to the gateway rather than to the process, so two gateways serving the
 * same accounts never inherit each other's cooling and a spec builds one gateway without disturbing
 * the next. It owes nothing to disk: the engine child restarting forgets every cooling child, one
 * uneven turn, and every pinned branch, which is the whole health model a person's metered accounts
 * deserve. A forgotten pin costs one fresh judgment, never a wrong answer.
 */
export function routingMemory(): RoutingMemory {
  return {
    ledger: createCooldownLedger(Date.now),
    cursors: createRotationCursors(),
    pins: createBranchPins(Date.now),
    now: Date.now,
  };
}
