import type { EngineRouting } from '@recompose/contracts';

import type { CooldownLedger } from './cooldown-ledger';
import type { Judging } from './judge-decision';
import type { RotationCursors } from './rotation-cursors';
import type { RouteNodeAddress } from './route-node-key';
import type { EngineRouter } from './route-table';
import type { WalkNote } from './walk-notes';

import { branchTheWalkFollows } from './judge-decision';
import { childTheModeOffers } from './policies';

/** Everything one walk carries as it descends: the table, the state it reads, and what it learned. */
export type Walking = {
  routing: EngineRouting;
  slug: string;
  virtualModel: string;
  ledger: CooldownLedger;
  cursors: RotationCursors;
  resumesServerState: boolean;
  attempted: Map<string, WalkNote>;
  judging: Judging;
  spent: Set<string>;
};

/** Where one descent ends: a child to try, a router that must not spread, a retry, or nothing. */
export type WalkStep =
  | { at: 'target'; routeNode: string }
  | { at: 'rotation'; routeNode: string; router: EngineRouter }
  | { at: 'again' }
  | { at: 'nowhere' };

type Descent = { step: WalkStep } | { router: EngineRouter };

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

async function childTheRouterOffers(
  walking: Walking,
  routeNode: string,
  router: EngineRouter,
  path: ReadonlySet<string>,
): Promise<string | undefined> {
  const address = addressOf(walking, routeNode);
  const policy = router.policy;

  return childTheModeOffers(policy.mode, {
    children: router.children,
    canServe: (child) => subtreeCanServe(walking, child, new Set(path)),
    turn: {
      cursor: () => walking.cursors.cursorAt(address),
      advanceTo: (cursor) => {
        walking.cursors.advanceTo(address, cursor);
      },
    },
    branch: await branchTheWalkFollows(routeNode, policy, walking.judging),
  });
}

function stepAtTarget(walking: Walking, routeNode: string): WalkStep {
  return canAttempt(walking, routeNode) ? { at: 'target', routeNode } : { at: 'nowhere' };
}

function wouldRotate(walking: Walking, router: EngineRouter): boolean {
  return walking.resumesServerState && router.policy.mode === 'round-robin';
}

/**
 * What one route node settles for the descent, or the router the descent must ask.
 *
 * @summary A turn resuming state one account holds is refused at the router that would have spread
 * it, whichever depth that router stands at, because routers chain and only the router about to
 * rotate knows it is about to. Asking the entry alone would let a ladder below it hand a second
 * account a token it cannot read. The question is asked before the router picks, so a spreading
 * router holding no child still refuses the chain rather than reporting itself empty.
 */
function descentAt(walking: Walking, routeNode: string): Descent {
  const node = walking.routing.nodes[routeNode];

  if (node === undefined) return { step: { at: 'nowhere' } };

  if (node.kind === 'target') return { step: stepAtTarget(walking, routeNode) };

  return wouldRotate(walking, node)
    ? { step: { at: 'rotation', routeNode, router: node } }
    : { router: node };
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

/** Where the walk arrives next, descending from the entry until a node settles the question. */
export async function stepTheWalkTakesNext(walking: Walking): Promise<WalkStep> {
  const path = new Set<string>();
  let routeNode = walking.routing.entry;

  for (;;) {
    path.add(routeNode);

    const descent = descentAt(walking, routeNode);

    if ('step' in descent) return descent.step;

    const offered = await childTheRouterOffers(walking, routeNode, descent.router, path);

    if (offered === undefined) {
      return stepPastARouterOfferingNothing(walking, routeNode, descent.router);
    }

    routeNode = offered;
  }
}
