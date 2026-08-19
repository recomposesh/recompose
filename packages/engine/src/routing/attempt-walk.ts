import type { EngineRouting } from '@recompose/contracts';

import type { CooldownLedger } from './cooldown-ledger';
import type { BranchClassifier, Judging } from './judge-decision';
import type { AttemptReading, AttemptReason } from './outcome-classification';
import type { RotationCursors } from './rotation-cursors';
import type { RouteNodeAddress } from './route-node-key';
import type { EngineRouter } from './route-table';

import { branchTheWalkFollows } from './judge-decision';
import { classify } from './outcome-classification';
import { childTheModeOffers } from './policies';
import { childlessRouterTheTableHolds, targetsInDeclaredOrder } from './route-table';

export const ATTEMPT_LIMIT = 8;

type NoteReason = AttemptReason | { because: 'cooling' };

type WalkNote = { routeNode: string; reason: NoteReason; retryAtMs?: number };

type WalkVerdict<TAnswer> =
  | { outcome: 'answered'; routeNode: string; answer: TAnswer }
  | { outcome: 'empty-router'; routeNode: string; router: EngineRouter }
  | { outcome: 'chained-turn'; routeNode: string; router: EngineRouter }
  | { outcome: 'exhausted'; retryAtMs?: number };

export type WalkResult<TAnswer> = { notes: readonly WalkNote[]; verdict: WalkVerdict<TAnswer> };

export type WalkRequest<TAnswer> = {
  routing: EngineRouting;
  slug: string;
  virtualModel: string;
  ledger: CooldownLedger;
  cursors: RotationCursors;
  resumesServerState: boolean;
  now: () => number;
  classifyBranch?: BranchClassifier;
  pinnedBranchAt?: (routeNode: string) => string | undefined;
  attempt: (routeNode: string) => Promise<AttemptReading<TAnswer>>;
};

type Walking = {
  routing: EngineRouting;
  slug: string;
  virtualModel: string;
  ledger: CooldownLedger;
  cursors: RotationCursors;
  resumesServerState: boolean;
  attempted: Map<string, WalkNote>;
  judging: Judging;
};

type WalkStep =
  | { at: 'target'; routeNode: string }
  | { at: 'rotation'; routeNode: string; router: EngineRouter }
  | { at: 'nowhere' };

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

function judgingOf<TAnswer>(request: WalkRequest<TAnswer>): Judging {
  const { slug, virtualModel } = request;

  return {
    classify: request.classifyBranch,
    resumesServerState: request.resumesServerState,
    pinnedBranchAt: (routeNode) => request.pinnedBranchAt?.(routeNode),
    judgeStandsCooling: (judge) =>
      request.ledger.coolingAt({ slug, virtualModel, routeNode: judge }) !== undefined,
    decided: new Map(),
  };
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
 * Where the walk arrives next: a child to try, a router it must not spread, or nowhere left.
 *
 * @summary A turn resuming state one account holds is refused at the router that would have spread
 * it, whichever depth that router stands at, because routers chain and only the router about to
 * rotate knows it is about to. Asking the entry alone would let a ladder below it hand a second
 * account a token it cannot read. The question is asked before the router picks, so a spreading
 * router holding no child still refuses the chain rather than reporting itself empty.
 */
async function stepTheWalkTakesNext(walking: Walking): Promise<WalkStep> {
  const path = new Set<string>();
  let routeNode: string | undefined = walking.routing.entry;

  while (routeNode !== undefined) {
    path.add(routeNode);

    const node = walking.routing.nodes[routeNode];

    if (node === undefined) return { at: 'nowhere' };

    if (node.kind === 'target') return stepAtTarget(walking, routeNode);

    if (wouldRotate(walking, node)) return { at: 'rotation', routeNode, router: node };

    routeNode = await childTheRouterOffers(walking, routeNode, node, path);
  }

  return { at: 'nowhere' };
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

async function verdictOneChildSettled<TAnswer>(
  walking: Walking,
  request: WalkRequest<TAnswer>,
  routeNode: string,
): Promise<WalkVerdict<TAnswer> | undefined> {
  const verdict = classify(await request.attempt(routeNode), request.now());

  if (verdict.verdict === 'answer') {
    return { outcome: 'answered', routeNode, answer: verdict.answer };
  }

  request.ledger.cool(addressOf(walking, routeNode), verdict);
  walking.attempted.set(routeNode, noteOf(routeNode, verdict.reason, verdict.retryAtMs));

  return undefined;
}

async function verdictTheWalkSettles<TAnswer>(
  walking: Walking,
  request: WalkRequest<TAnswer>,
): Promise<WalkVerdict<TAnswer> | undefined> {
  while (walking.attempted.size < ATTEMPT_LIMIT) {
    const step = await stepTheWalkTakesNext(walking);

    if (step.at === 'nowhere') return undefined;

    if (step.at === 'rotation') {
      return { outcome: 'chained-turn', routeNode: step.routeNode, router: step.router };
    }

    const settled = await verdictOneChildSettled(walking, request, step.routeNode);

    if (settled !== undefined) return settled;
  }

  return undefined;
}

/**
 * The walk one request takes across a route table until a child answers or none can.
 *
 * @summary It decides and records; it opens no connection and knows no transport, because the
 * attempt and the branch classification both arrive injected and the answer crosses back untouched.
 * Termination is structural rather
 * than counted: a child attempted once is never eligible again, so the attempted set only grows and
 * the recorded cap bounds it against a table too wide to walk. Every child the walk could not use
 * earns a note in the table's declared order, whichever order the policies actually tried them, so
 * the account a refusal gives reads the same as the canvas that drew it.
 */
export async function walkAttempts<TAnswer>(
  request: WalkRequest<TAnswer>,
): Promise<WalkResult<TAnswer>> {
  const walking: Walking = { ...request, attempted: new Map(), judging: judgingOf(request) };
  const settled = await verdictTheWalkSettles(walking, request);
  const notes = notesOfTheWalk(walking);

  return { notes, verdict: settled ?? verdictWhenNoChildServed(walking, notes) };
}
