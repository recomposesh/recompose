import type { EngineRouting } from '@recompose/contracts';

import type { CooldownLedger } from './cooldown-ledger';
import type { JudgedChoice, Judging } from './judge-decision';
import type { UnjudgedCause } from './outcome-classification';
import type { RotationCursors, TurnTaken } from './rotation-cursors';
import type { RouteNodeAddress } from './route-node-key';
import type { EngineRouter } from './route-table';
import type { WalkNote } from './walk-notes';

import { branchTheWalkFollows } from './judge-decision';
import { childTheModeOffers } from './policies';

/**
 * The child one conversation keeps at a spreading router, already bound to that conversation.
 *
 * @summary A round-robin router hands a turn to whichever child is next, and a turn resuming state
 * one account minted can only be read by that account. The child it took is therefore written down
 * when the conversation opens and followed on every sealed turn after it, which is what lets a
 * ladder spread conversations without ever spreading one conversation.
 */
export type RotationPins = {
  pinnedChildAt: (routeNode: string) => string | undefined;
  pinChildAt: (routeNode: string, child: string) => void;
};

/** Everything one walk carries as it descends: the table, the state it reads, and what it learned. */
export type Walking = {
  routing: EngineRouting;
  slug: string;
  virtualModel: string;
  ledger: CooldownLedger;
  cursors: RotationCursors;
  rotationPins: RotationPins;
  resumesServerState: boolean;
  attempted: Map<string, WalkNote>;
  judging: Judging;
  spent: Set<string>;
};

/**
 * Where one descent ends: a child to try, a router that must not spread, a router no judgment
 * reached, a retry, or nothing.
 */
export type WalkStep =
  | { at: 'target'; routeNode: string }
  | { at: 'rotation'; routeNode: string; router: EngineRouter }
  | { at: 'unjudged'; routeNode: string; router: EngineRouter; because: UnjudgedCause }
  | { at: 'again' }
  | { at: 'nowhere' };

type Descent = { step: WalkStep } | { router: EngineRouter } | { descendTo: string };

/** Where one route node of this walk stands in the ledger and the cursors. */
export function addressOf(walking: Walking, routeNode: string): RouteNodeAddress {
  return { slug: walking.slug, virtualModel: walking.virtualModel, routeNode };
}

function canAttempt(walking: Walking, routeNode: string): boolean {
  return (
    !walking.attempted.has(routeNode) &&
    walking.ledger.coolingAt(addressOf(walking, routeNode)) === undefined
  );
}

/**
 * Whether anything under one route node could still take the request.
 *
 * @summary A conditional router answers for its whole subtree before a judge has spoken, because
 * which branch it will name is unknown and any of them may be the one. Once it has spoken and the
 * branch it named and its else have both stood down, the router is spent and answers no, so the
 * ladder above it stops offering a turn to a router that would hand the request nowhere.
 */
function subtreeCanServe(walking: Walking, routeNode: string, passed: Set<string>): boolean {
  if (passed.has(routeNode)) return false;

  passed.add(routeNode);

  const node = walking.routing.nodes[routeNode];

  if (node === undefined) return false;

  if (node.kind === 'target') return canAttempt(walking, routeNode);

  if (walking.spent.has(routeNode)) return false;

  return node.children.some((child) => subtreeCanServe(walking, child, passed));
}

type TurnHeld = { address: RouteNodeAddress } & TurnTaken;

/** One descent from the entry: where it has been, and the turns it took on the way down. */
type Descending = { walking: Walking; path: Set<string>; turns: TurnHeld[] };

async function childTheRouterOffers(
  descending: Descending,
  routeNode: string,
  router: EngineRouter,
  branch: JudgedChoice | undefined,
): Promise<string | undefined> {
  const { walking, path, turns } = descending;
  const address = addressOf(walking, routeNode);

  const offered = await childTheModeOffers(router.policy.mode, {
    children: router.children,
    canServe: (child) => subtreeCanServe(walking, child, new Set(path)),
    turn: {
      cursor: () => walking.cursors.cursorAt(address),
      advanceTo: (cursor) => {
        turns.push({ address, was: walking.cursors.cursorAt(address), cursor });
        walking.cursors.advanceTo(address, cursor);
      },
    },
    branch,
  });

  if (offered !== undefined && router.policy.mode === 'round-robin') {
    walking.rotationPins.pinChildAt(routeNode, offered);
  }

  return offered;
}

function stepAtTarget(walking: Walking, routeNode: string): WalkStep {
  return canAttempt(walking, routeNode) ? { at: 'target', routeNode } : { at: 'nowhere' };
}

function wouldRotate(walking: Walking, router: EngineRouter): boolean {
  return walking.resumesServerState && router.policy.mode === 'round-robin';
}

/**
 * The child a sealed turn returns to at one spreading router, where that child can still serve it.
 *
 * @summary A kept child standing cooling is worth no more than no child at all, because the seal
 * travels to that one account or nowhere, so the walk refuses instead of reaching for the sibling
 * the ladder would otherwise offer. Moving the turn is the one repair that cannot work.
 */
function childTheRotationKeeps(descending: Descending, routeNode: string): string | undefined {
  const kept = descending.walking.rotationPins.pinnedChildAt(routeNode);

  if (kept === undefined) return undefined;

  return subtreeCanServe(descending.walking, kept, new Set(descending.path)) ? kept : undefined;
}

/**
 * What one route node settles for the descent, or the router the descent must ask.
 *
 * @summary A turn resuming state one account holds never spreads: it follows the child its
 * conversation already took, and refuses at the router that would have spread it when no such child
 * can serve. The question is settled at whichever depth that router stands, because routers chain
 * and only the router about to rotate knows it is about to. Asking the entry alone would let a
 * ladder below it hand a second account a token it cannot read.
 */
function descentAt(descending: Descending, routeNode: string): Descent {
  const walking = descending.walking;
  const node = walking.routing.nodes[routeNode];

  if (node === undefined) return { step: { at: 'nowhere' } };

  if (node.kind === 'target') return { step: stepAtTarget(walking, routeNode) };

  if (!wouldRotate(walking, node)) return { router: node };

  const kept = childTheRotationKeeps(descending, routeNode);

  return kept === undefined
    ? { step: { at: 'rotation', routeNode, router: node } }
    : { descendTo: kept };
}

/**
 * Where a descent that reached a router offering nothing goes: back to the entry, or nowhere.
 *
 * @summary Only a conditional router earns a second descent, and only the first time it comes up
 * empty. A judged branch that stood down leaves the router itself unable to serve, which the ladder
 * above it could not know until the judge had spoken, so the walk records that and starts again
 * rather than reporting a table exhausted while a healthy sibling stands beside it. Recording it
 * before returning is what bounds the retries: every router comes up empty at most once.
 */
function stepPastARouterOfferingNothing(
  walking: Walking,
  routeNode: string,
  router: EngineRouter,
): WalkStep {
  if (router.policy.mode !== 'conditional' || walking.spent.has(routeNode)) {
    return { at: 'nowhere' };
  }

  walking.spent.add(routeNode);

  return { at: 'again' };
}

/**
 * Hands back every turn this descent took, wherever the router still stands where it left it.
 *
 * @summary A round-robin router spends a turn only on a subtree that took the request, so a descent
 * that came up empty gives its turns back and the child that would have been next is still next
 * rather than skipped for a subtree that carried nothing. The turn is taken at the pick rather than
 * held until the descent lands, because a judge call parks a walk mid-descent and a walk arriving
 * beside it would read a cursor nobody had moved and pick the very child the first one is carrying.
 */
function turnsHandedBack(descending: Descending): void {
  for (const turn of descending.turns) {
    descending.walking.cursors.handBack(turn.address, turn);
  }
}

/**
 * The trouble that left one router's branch decision unjudged, or nothing where a judgment placed it.
 *
 * @summary A router of any other mode decides nothing here, so it answers nothing and never stands
 * in the way of a walk that never involved a judge. The trouble travels rather than a bare yes,
 * because the step this ends the walk at is the last thing that can carry it to the refusal.
 */
function troubleThatJudgedNothing(branch: JudgedChoice | undefined): UnjudgedCause | undefined {
  if (branch === undefined || branch.judged) return undefined;

  return branch.because;
}

type Asked = { step: WalkStep } | { descendTo: string };

/**
 * What one router hands the descent: the child to carry on at, or the step that ends the walk here.
 *
 * @summary A router that reached no judgment and a router that offered nothing both hand back turns
 * before answering, because a turn spent on a subtree that took no request would skip the child that
 * was next for the request that follows.
 */
async function askedOfTheRouter(
  descending: Descending,
  routeNode: string,
  router: EngineRouter,
): Promise<Asked> {
  const branch = await branchTheWalkFollows(routeNode, router.policy, descending.walking.judging);
  const because = troubleThatJudgedNothing(branch);

  if (because !== undefined) {
    turnsHandedBack(descending);

    return { step: { at: 'unjudged', routeNode, router, because } };
  }

  const offered = await childTheRouterOffers(descending, routeNode, router, branch);

  if (offered !== undefined) return { descendTo: offered };

  turnsHandedBack(descending);

  return { step: stepPastARouterOfferingNothing(descending.walking, routeNode, router) };
}

/** Where the walk arrives next, descending from the entry until a node settles the question. */
export async function stepTheWalkTakesNext(walking: Walking): Promise<WalkStep> {
  const descending: Descending = { walking, path: new Set<string>(), turns: [] };
  let routeNode = walking.routing.entry;

  for (;;) {
    descending.path.add(routeNode);

    const descent = descentAt(descending, routeNode);
    const asked =
      'router' in descent ? await askedOfTheRouter(descending, routeNode, descent.router) : descent;

    if ('step' in asked) return asked.step;

    routeNode = asked.descendTo;
  }
}
