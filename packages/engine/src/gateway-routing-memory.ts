import type { BranchPinTally } from '@recompose/contracts';

import type { CooldownLedger } from './routing/cooldown-ledger';
import type { RotationCursors } from './routing/rotation-cursors';
import type { RouteNodeAddress } from './routing/route-node-key';

import { publishBranchPinTally } from './gateway-branch-pins-watch';
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

type Pinned = { address: RouteNodeAddress; child: string; touchedAtMs: number };

export type TallyBranchPins = (address: RouteNodeAddress, pinned: BranchPinTally) => void;

export type BranchPins = {
  pinnedAt: (address: RouteNodeAddress, fingerprint: string) => string | undefined;
  pin: (address: RouteNodeAddress, fingerprint: string, child: string) => void;
};

function pinKey(address: RouteNodeAddress, fingerprint: string): string {
  return JSON.stringify([routeNodeKey(address), fingerprint]);
}

function forgetPastTheBound(held: Map<string, Pinned>): RouteNodeAddress[] {
  const dropped: RouteNodeAddress[] = [];

  for (const [oldest, pinned] of held) {
    if (held.size <= PINNED_CONVERSATION_LIMIT) break;

    held.delete(oldest);
    dropped.push(pinned.address);
  }

  return dropped;
}

function tallyAt(held: Map<string, Pinned>, address: RouteNodeAddress): BranchPinTally {
  const asked = routeNodeKey(address);
  const counted: BranchPinTally = {};

  for (const pinned of held.values()) {
    if (routeNodeKey(pinned.address) !== asked) continue;

    counted[pinned.child] = (counted[pinned.child] ?? 0) + 1;
  }

  return counted;
}

/**
 * Says what each named router now holds, once per router however many times it was named.
 *
 * @summary One write can move two routers at once, because the write that fills the store is also
 * the write that drops somebody else's oldest conversation. Counting is a reading of the whole
 * store rather than a running total, so a router says a number that is true when it says it rather
 * than one assembled from every change that ever reached it.
 */
function tellWhatTheyHold(
  held: Map<string, Pinned>,
  moved: readonly RouteNodeAddress[],
  tallied: TallyBranchPins,
): void {
  const told = new Set<string>();

  for (const address of moved) {
    const key = routeNodeKey(address);

    if (told.has(key)) continue;

    told.add(key);
    tallied(address, tallyAt(held, address));
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
export function createBranchPins(
  now: () => number,
  tallied: TallyBranchPins = () => undefined,
): BranchPins {
  const held = new Map<string, Pinned>();

  const keep = (key: string, address: RouteNodeAddress, child: string) => {
    held.delete(key);
    held.set(key, { address, child, touchedAtMs: now() });
  };

  return {
    pinnedAt: (address, fingerprint) => {
      const key = pinKey(address, fingerprint);
      const pinned = held.get(key);

      if (pinned === undefined) return undefined;

      if (now() - pinned.touchedAtMs > PIN_IDLE_MS) {
        held.delete(key);
        tellWhatTheyHold(held, [address], tallied);

        return undefined;
      }

      keep(key, address, pinned.child);

      return pinned.child;
    },
    pin: (address, fingerprint, child) => {
      keep(pinKey(address, fingerprint), address, child);
      tellWhatTheyHold(held, [address, ...forgetPastTheBound(held)], tallied);
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
    pins: createBranchPins(Date.now, publishBranchPinTally),
    now: Date.now,
  };
}
