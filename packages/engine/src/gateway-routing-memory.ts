import type { BranchPinTally } from '@recompose/contracts';

import type { KeptChild, PinKeeping } from './gateway-kept-child';
import type { CooldownLedger } from './routing/cooldown-ledger';
import type { RotationCursors } from './routing/rotation-cursors';
import type { RouteNodeAddress } from './routing/route-node-key';

import { publishBranchPinTally } from './gateway-branch-pins-watch';
import { publishCooldown } from './gateway-cooldowns-watch';
import { keptChildFile } from './gateway-kept-child-file';
import { createCooldownLedger } from './routing/cooldown-ledger';
import { createRotationCursors } from './routing/rotation-cursors';
import { routeNodeKey } from './routing/route-node-key';

export const PINNED_CONVERSATION_LIMIT = 500;

/**
 * How long a conversation may go quiet before its branch is forgotten, unless the environment
 * names a shorter window.
 *
 * @summary The pin exists to keep a provider's prompt cache warm and a conversation's behavior
 * steady, and every vendor cache it protects expires within minutes of silence. Holding a decision
 * past that window buys no cache hit and only keeps a stale judgment alive, so the window sits just
 * above the shortest cache lifetime rather than as long as memory would allow.
 */
export const PIN_IDLE_MS = 600_000;

/**
 * Where this gateway keeps its spread conversations, or nowhere when the host named no directory.
 *
 * @summary The engine child runs headless in tests and in a person's app alike, and only the app
 * knows a writable directory. A child nobody told keeps every conversation in memory, which is what
 * every spec and every embedded run wants and what the gateway did before disk entered it.
 */
function keptChildDirectory(): string | null {
  const named = process.env['RECOMPOSE_ROUTING_DIR']?.trim();

  return named === undefined || named === '' ? null : named;
}

function pinKeeping(slug: string): PinKeeping | undefined {
  const directory = keptChildDirectory();

  return directory === null ? undefined : keptChildFile(directory, slug);
}

function namedPinIdleWindow(): string | null {
  const named = process.env['RECOMPOSE_PIN_IDLE_MS']?.trim();

  return named === undefined || named === '' ? null : named;
}

/**
 * The window this gateway ages its pins over: the environment's, or the ten-minute default.
 *
 * @summary A scenario proving that an idle conversation is re-judged cannot rest ten real minutes,
 * and the pin ages on the engine child's own clock, which nothing outside that process can move. An
 * environment variable is the one seam a scenario already owns, so the window opens there rather
 * than through a directive a person could send at runtime. A window that is not a positive whole
 * number of milliseconds is refused instead of clamped, so a typo cannot quietly age every
 * conversation out from under a person.
 */
function pinIdleWindow(): number {
  const named = namedPinIdleWindow();

  if (named === null) return PIN_IDLE_MS;

  const span = Number(named);

  if (Number.isSafeInteger(span) && span > 0) return span;

  console.error(
    'The engine child ignored RECOMPOSE_PIN_IDLE_MS, because it does not name a positive whole number of milliseconds.',
  );

  return PIN_IDLE_MS;
}

type Pinned = {
  address: RouteNodeAddress;
  fingerprint: string;
  child: string;
  touchedAtMs: number;
};

const EMPTY_KEEPING: PinKeeping = { restored: () => [], keep: () => undefined };

export type TallyPinnedChildren = (address: RouteNodeAddress, pinned: BranchPinTally) => void;

export type ConversationPins = {
  pinnedAt: (address: RouteNodeAddress, fingerprint: string) => string | undefined;
  pin: (address: RouteNodeAddress, fingerprint: string, child: string) => void;
};

function pinKey(address: RouteNodeAddress, fingerprint: string): string {
  return JSON.stringify([routeNodeKey(address), fingerprint]);
}

function keptChildrenOf(held: Map<string, Pinned>): readonly KeptChild[] {
  return [...held.values()].map((pinned) => ({
    ...pinned.address,
    fingerprint: pinned.fingerprint,
    child: pinned.child,
    touchedAtMs: pinned.touchedAtMs,
  }));
}

/**
 * The conversations a store opens holding, once the stale and the overflowing are dropped.
 *
 * @summary A keeper is trusted for what it holds and never for how much of it still counts, so the
 * same window and the same bound run over a restored set as over a live one. They arrive oldest
 * first, which is the order eviction reads them back out in.
 */
function keptChildrenWorthOpeningOn(
  keeping: PinKeeping,
  now: number,
  idleWindowMs: number,
): readonly KeptChild[] {
  const latest = new Map<string, KeptChild>();

  for (const record of keeping.restored()) latest.set(pinKey(record, record.fingerprint), record);

  return [...latest.values()]
    .filter((record) => now - record.touchedAtMs <= idleWindowMs)
    .sort((earlier, later) => earlier.touchedAtMs - later.touchedAtMs)
    .slice(-PINNED_CONVERSATION_LIMIT);
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
  tallied: TallyPinnedChildren,
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
 * The child each conversation earned, per router, for as long as it keeps talking.
 *
 * @summary Two bounds hold it: a conversation that goes quiet is forgotten, and a gateway busier
 * than the store is wide forgets whichever conversation spoke longest ago. A desktop process runs
 * for weeks, so a map that only ever grew would spend a person's memory remembering routing
 * decisions for conversations that ended months earlier. Reading a pin counts as talking, which is
 * what lets a long conversation outlive the window while an abandoned one falls out of it.
 */
export function createConversationPins(
  now: () => number,
  tallied: TallyPinnedChildren = () => undefined,
  idleWindowMs: number = PIN_IDLE_MS,
  keeping?: PinKeeping,
): ConversationPins {
  const held = new Map<string, Pinned>();

  for (const record of keptChildrenWorthOpeningOn(keeping ?? EMPTY_KEEPING, now(), idleWindowMs)) {
    held.set(pinKey(record, record.fingerprint), {
      address: {
        slug: record.slug,
        virtualModel: record.virtualModel,
        routeNode: record.routeNode,
      },
      fingerprint: record.fingerprint,
      child: record.child,
      touchedAtMs: record.touchedAtMs,
    });
  }

  const touch = (address: RouteNodeAddress, fingerprint: string, child: string) => {
    const key = pinKey(address, fingerprint);

    held.delete(key);
    held.set(key, { address, fingerprint, child, touchedAtMs: now() });
  };

  const handOver = () => {
    keeping?.keep(keptChildrenOf(held));
  };

  return {
    pinnedAt: (address, fingerprint) => {
      const pinned = held.get(pinKey(address, fingerprint));

      if (pinned === undefined) return undefined;

      if (now() - pinned.touchedAtMs > idleWindowMs) {
        held.delete(pinKey(address, fingerprint));
        tellWhatTheyHold(held, [address], tallied);
        handOver();

        return undefined;
      }

      touch(address, fingerprint, pinned.child);
      handOver();

      return pinned.child;
    },
    pin: (address, fingerprint, child) => {
      touch(address, fingerprint, child);
      tellWhatTheyHold(held, [address, ...forgetPastTheBound(held)], tallied);
      handOver();
    },
  };
}

export type RoutingMemory = {
  ledger: CooldownLedger;
  cursors: RotationCursors;
  pins: ConversationPins;
  rotationPins: ConversationPins;
  now: () => number;
};

/**
 * What one gateway remembers between requests: which children stand down, whose turn is next, and
 * which child each conversation earned at a router that decides or spreads.
 *
 * @summary The memory belongs to the gateway rather than to the process, so two gateways serving the
 * same accounts never inherit each other's cooling and a spec builds one gateway without disturbing
 * the next. A branch and a spread child are held in separate stores because only the branch is drawn
 * on the canvas, and one store would count a rotation's accounts onto a conditional router's card.
 *
 * One of the two outlives the process. Cooling, turn cursors and a decided branch each cost one
 * ordinary request when a restart forgets them, so they stay in memory. A spread conversation costs
 * a refusal instead, because the account holding its state is the only account that can read it, so
 * the child it was given is the one thing here written down.
 */
export function routingMemory(slug: string): RoutingMemory {
  return {
    ledger: createCooldownLedger(Date.now, publishCooldown),
    cursors: createRotationCursors(),
    pins: createConversationPins(Date.now, publishBranchPinTally, pinIdleWindow()),
    rotationPins: createConversationPins(Date.now, undefined, pinIdleWindow(), pinKeeping(slug)),
    now: Date.now,
  };
}
