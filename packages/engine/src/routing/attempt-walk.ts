import type { EngineRouting } from '@recompose/contracts';

import type { CooldownLedger } from './cooldown-ledger';
import type { JudgedRequest, Judging } from './judge-decision';
import type { AttemptReading } from './outcome-classification';
import type { RotationCursors } from './rotation-cursors';
import type { EngineRouter } from './route-table';
import type { Walking, WalkStep } from './walk-descent';
import type { WalkNote } from './walk-notes';

import { classify } from './outcome-classification';
import { childlessRouterTheTableHolds, targetsInDeclaredOrder } from './route-table';
import { addressOf, stepTheWalkTakesNext } from './walk-descent';
import { noteOf, retryTimeEveryNotePromised } from './walk-notes';

export const ATTEMPT_LIMIT = 8;

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
  judged: JudgedRequest;
  attempt: (routeNode: string) => Promise<AttemptReading<TAnswer>>;
};

function judgingOf<TAnswer>(request: WalkRequest<TAnswer>): Judging {
  const { slug, virtualModel } = request;

  return {
    classify: request.judged.classifyBranch,
    resumesServerState: request.resumesServerState,
    pinnedBranchAt: request.judged.pinnedBranchAt,
    pinBranchAt: request.judged.pinBranchAt,
    judgeStandsCooling: (judge) =>
      request.ledger.coolingAt({ slug, virtualModel, routeNode: judge }) !== undefined,
    decided: new Map(),
  };
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

async function verdictOneStepSettles<TAnswer>(
  walking: Walking,
  request: WalkRequest<TAnswer>,
  step: WalkStep,
): Promise<WalkVerdict<TAnswer> | undefined> {
  if (step.at === 'rotation') {
    return { outcome: 'chained-turn', routeNode: step.routeNode, router: step.router };
  }

  return step.at === 'target'
    ? verdictOneChildSettled(walking, request, step.routeNode)
    : undefined;
}

async function verdictTheWalkSettles<TAnswer>(
  walking: Walking,
  request: WalkRequest<TAnswer>,
): Promise<WalkVerdict<TAnswer> | undefined> {
  while (walking.attempted.size < ATTEMPT_LIMIT) {
    const step = await stepTheWalkTakesNext(walking);

    if (step.at === 'nowhere') return undefined;

    const settled = await verdictOneStepSettles(walking, request, step);

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
 * the recorded cap bounds it against a table too wide to walk. A descent reaching no child at all
 * starts over at most once per conditional router, since the router is written down as spent before
 * the restart, so the two growing sets together bound the loop. Every child the walk could not use
 * earns a note in the table's declared order, whichever order the policies actually tried them, so
 * the account a refusal gives reads the same as the canvas that drew it.
 */
export async function walkAttempts<TAnswer>(
  request: WalkRequest<TAnswer>,
): Promise<WalkResult<TAnswer>> {
  const walking: Walking = {
    ...request,
    attempted: new Map(),
    judging: judgingOf(request),
    spent: new Set(),
  };
  const settled = await verdictTheWalkSettles(walking, request);
  const notes = notesOfTheWalk(walking);

  return { notes, verdict: settled ?? verdictWhenNoChildServed(walking, notes) };
}
