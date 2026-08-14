import type { EngineRouting, RouterPolicy } from '@recompose/contracts';

import type { CooldownLedger } from './cooldown-ledger';
import type { AttemptReading, AttemptReason } from './outcome-classification';
import type { ChildCanServe } from './policies';
import type { RotationCursors } from './rotation-cursors';
import type { RouteNodeAddress } from './route-node-key';
import type { EngineRouter } from './route-table';

import { classify } from './outcome-classification';
import { nextFailoverChild, nextRoundRobinChild } from './policies';
import { childlessRouterTheTableHolds, targetsInDeclaredOrder } from './route-table';

export const ATTEMPT_LIMIT = 8;

type NoteReason = AttemptReason | { because: 'cooling' };

type WalkNote = { routeNode: string; reason: NoteReason; retryAtMs?: number };

type WalkVerdict<TAnswer> =
  | { outcome: 'answered'; routeNode: string; answer: TAnswer }
  | { outcome: 'empty-router'; routeNode: string; router: EngineRouter }
  | { outcome: 'exhausted'; retryAtMs?: number };

export type WalkResult<TAnswer> = { notes: readonly WalkNote[]; verdict: WalkVerdict<TAnswer> };

export type WalkRequest<TAnswer> = {
  routing: EngineRouting;
  slug: string;
  virtualModel: string;
  ledger: CooldownLedger;
  cursors: RotationCursors;
  now: () => number;
  attempt: (routeNode: string) => Promise<AttemptReading<TAnswer>>;
};

type Walking = {
  routing: EngineRouting;
  slug: string;
  virtualModel: string;
  ledger: CooldownLedger;
  cursors: RotationCursors;
  attempted: Map<string, WalkNote>;
};

type Turn = { cursor: () => number; advanceTo: (cursor: number) => void };

type ChildPicker = (
  children: readonly string[],
  canServe: ChildCanServe,
  turn: Turn,
) => string | undefined;

const PICK_BY_MODE: Record<RouterPolicy['mode'], ChildPicker> = {
  failover: (children, canServe) => nextFailoverChild(children, canServe),
  'round-robin': (children, canServe, turn) => {
    const spun = nextRoundRobinChild(children, canServe, turn.cursor());

    turn.advanceTo(spun.cursor);

    return spun.child;
  },
};

function addressOf(walking: Walking, routeNode: string): RouteNodeAddress {
  return { slug: walking.slug, virtualModel: walking.virtualModel, routeNode };
}

function canAttempt(walking: Walking, routeNode: string): boolean {
  return (
    !walking.attempted.has(routeNode) &&
    walking.ledger.coolingAt(addressOf(walking, routeNode)) === undefined
  );
}

function subtreeCanServe(walking: Walking, routeNode: string, passed: Set<string>): boolean {
  if (passed.has(routeNode)) return false;

  passed.add(routeNode);

  const node = walking.routing.nodes[routeNode];

  if (node === undefined) return false;

  if (node.kind === 'target') return canAttempt(walking, routeNode);

  return node.children.some((child) => subtreeCanServe(walking, child, passed));
}

function childTheRouterOffers(
  walking: Walking,
  routeNode: string,
  router: EngineRouter,
  path: ReadonlySet<string>,
): string | undefined {
  const address = addressOf(walking, routeNode);

  return PICK_BY_MODE[router.policy.mode](
    router.children,
    (child) => subtreeCanServe(walking, child, new Set(path)),
    {
      cursor: () => walking.cursors.cursorAt(address),
      advanceTo: (cursor) => {
        walking.cursors.advanceTo(address, cursor);
      },
    },
  );
}

function attemptableTarget(walking: Walking, routeNode: string): string | undefined {
  return canAttempt(walking, routeNode) ? routeNode : undefined;
}

function targetTheWalkTriesNext(walking: Walking): string | undefined {
  const path = new Set<string>();
  let routeNode: string | undefined = walking.routing.entry;

  while (routeNode !== undefined) {
    path.add(routeNode);

    const node = walking.routing.nodes[routeNode];

    if (node === undefined) return undefined;

    if (node.kind === 'target') return attemptableTarget(walking, routeNode);

    routeNode = childTheRouterOffers(walking, routeNode, node, path);
  }

  return undefined;
}

function noteOf(routeNode: string, reason: NoteReason, retryAtMs: number | undefined): WalkNote {
  return retryAtMs === undefined ? { routeNode, reason } : { routeNode, reason, retryAtMs };
}

function noteForTarget(walking: Walking, routeNode: string): WalkNote | undefined {
  const attempted = walking.attempted.get(routeNode);

  if (attempted !== undefined) return attempted;

  const cooling = walking.ledger.coolingAt(addressOf(walking, routeNode));

  return cooling === undefined
    ? undefined
    : noteOf(routeNode, { because: 'cooling' }, cooling.retryAtMs);
}

function notesOfTheWalk(walking: Walking): readonly WalkNote[] {
  const notes: WalkNote[] = [];

  for (const target of targetsInDeclaredOrder(walking.routing)) {
    const note = noteForTarget(walking, target.routeNode);

    if (note !== undefined) notes.push(note);
  }

  return notes;
}

function retryTimeEveryNotePromised(notes: readonly WalkNote[]): number | undefined {
  const promised: number[] = [];

  for (const note of notes) {
    if (note.retryAtMs === undefined) return undefined;

    promised.push(note.retryAtMs);
  }

  return promised.length === 0 ? undefined : Math.min(...promised);
}

function verdictWhenNoChildServed<TAnswer>(
  walking: Walking,
  notes: readonly WalkNote[],
): WalkVerdict<TAnswer> {
  const childless =
    targetsInDeclaredOrder(walking.routing).length === 0
      ? childlessRouterTheTableHolds(walking.routing)
      : undefined;

  if (childless !== undefined) {
    return { outcome: 'empty-router', routeNode: childless.routeNode, router: childless.router };
  }

  const retryAtMs = retryTimeEveryNotePromised(notes);

  return retryAtMs === undefined ? { outcome: 'exhausted' } : { outcome: 'exhausted', retryAtMs };
}

/**
 * The walk one request takes across a route table until a child answers or none can.
 *
 * @summary It decides and records; it opens no connection and knows no transport, because the
 * attempt arrives injected and the answer crosses back untouched. Termination is structural rather
 * than counted: a child attempted once is never eligible again, so the attempted set only grows and
 * the recorded cap bounds it against a table too wide to walk. Every child the walk could not use
 * earns a note in the table's declared order, whichever order the policies actually tried them, so
 * the account a refusal gives reads the same as the canvas that drew it.
 */
export async function walkAttempts<TAnswer>(
  request: WalkRequest<TAnswer>,
): Promise<WalkResult<TAnswer>> {
  const walking: Walking = { ...request, attempted: new Map() };

  while (walking.attempted.size < ATTEMPT_LIMIT) {
    const routeNode = targetTheWalkTriesNext(walking);

    if (routeNode === undefined) break;

    const verdict = classify(await request.attempt(routeNode), request.now());

    if (verdict.verdict === 'answer') {
      return {
        notes: notesOfTheWalk(walking),
        verdict: { outcome: 'answered', routeNode, answer: verdict.answer },
      };
    }

    request.ledger.cool(addressOf(walking, routeNode), verdict);
    walking.attempted.set(routeNode, noteOf(routeNode, verdict.reason, verdict.retryAtMs));
  }

  const notes = notesOfTheWalk(walking);

  return { notes, verdict: verdictWhenNoChildServed(walking, notes) };
}
