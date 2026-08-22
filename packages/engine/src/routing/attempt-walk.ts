import type { EngineRouting } from '@recompose/contracts';

import type { CooldownLedger } from './cooldown-ledger';
import type { JudgedChoice, JudgedRequest, Judging } from './judge-decision';
import type { AttemptReading } from './outcome-classification';
import type { BranchChoice } from './policies';
import type { RotationCursors } from './rotation-cursors';
import type { EngineRouter } from './route-table';
import type { RotationPins, Walking, WalkStep } from './walk-descent';
import type { NoteReason, WalkNote } from './walk-notes';

import { classify } from './outcome-classification';
import { childlessRouterTheTableHolds, targetsInDeclaredOrder, targetsUnder } from './route-table';
import { addressOf, stepTheWalkTakesNext } from './walk-descent';
import { noteOf, retryTimeEveryTriedChildPromised } from './walk-notes';

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
  rotationPins: RotationPins;
  resumesServerState: boolean;
  now: () => number;
  judged: JudgedRequest;
  attempt: (routeNode: string) => Promise<AttemptReading<TAnswer>>;
};

function judgingOf<TAnswer>(request: WalkRequest<TAnswer>): Judging {
  return {
    classify: request.judged.classifyBranch,
    resumesServerState: request.resumesServerState,
    pinnedBranchAt: request.judged.pinnedBranchAt,
    pinBranchAt: request.judged.pinBranchAt,
    judgeStandsCooling: request.judged.judgeStandsCooling,
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

function notesOverTheTable(
  walking: Walking,
  noteFor: (routeNode: string) => WalkNote | undefined,
): readonly WalkNote[] {
  const notes: WalkNote[] = [];

  for (const target of targetsInDeclaredOrder(walking.routing)) {
    const note = noteFor(target.routeNode);

    if (note !== undefined) notes.push(note);
  }

  return notes;
}

function notesOfTheWalk(walking: Walking): readonly WalkNote[] {
  return notesOverTheTable(walking, (routeNode) => noteForTarget(walking, routeNode));
}

function targetsNamedUnder(walking: Walking, routeNode: string): readonly string[] {
  return targetsUnder(walking.routing, routeNode).map((target) => target.routeNode);
}

/**
 * Every target one conditional router's own decision walked past, however healthy it stood.
 *
 * @summary The router narrowed itself to the branch its judge named and the else beneath it, so
 * everything it holds outside those two is out of this request's reach for reasons that have
 * nothing to do with the child. Read from what the walk decided rather than from the policy,
 * because the policy alone cannot say which branch this particular request took.
 */
function targetsOneDecisionWalkedPast(
  walking: Walking,
  routeNode: string,
  choice: BranchChoice,
): readonly string[] {
  const inReach = new Set([
    ...targetsNamedUnder(walking, choice.decided),
    ...targetsNamedUnder(walking, choice.elseChild),
  ]);

  return targetsNamedUnder(walking, routeNode).filter((target) => !inReach.has(target));
}

/**
 * What one decision leaves the children it walked past reading as.
 *
 * @summary A judgment naming a branch left them off it, and the router is working. A judge that
 * named nothing sent every one of them to the else child, and the trouble is the judge's rather than
 * the branches', so a refusal that read the two the same way would send a person hunting a target
 * that never had anything wrong with it.
 */
function reasonOneDecisionLeaves(choice: JudgedChoice): NoteReason {
  return choice.judged ? { because: 'off-branch' } : { because: 'unjudged' };
}

function reasonsTheDecisionsLeave(walking: Walking): ReadonlyMap<string, NoteReason> {
  const walkedPast = new Map<string, NoteReason>();

  for (const [routeNode, choice] of walking.judging.decided) {
    for (const target of targetsOneDecisionWalkedPast(walking, routeNode, choice)) {
      walkedPast.set(target, reasonOneDecisionLeaves(choice));
    }
  }

  return walkedPast;
}

function noteForTargetWalkedPast(
  walking: Walking,
  routeNode: string,
  walkedPast: ReadonlyMap<string, NoteReason>,
): WalkNote | undefined {
  const attemptedOrCooling = noteForTarget(walking, routeNode);

  if (attemptedOrCooling !== undefined) return attemptedOrCooling;

  const stoodOff = walkedPast.get(routeNode);

  return stoodOff === undefined ? undefined : noteOf(routeNode, stoodOff, undefined);
}

/**
 * The account a walk that served nobody owes, which names the children a decision walked past.
 *
 * @summary A walk that served owes no such account: the branches it did not take are the router
 * working rather than children it failed to use. A walk that served nobody owes the whole picture, so
 * the child standing off the decided branch is named here even though nothing ever asked it and it
 * promises nothing about when to come back. Naming it costs the caller no wait, because the time a
 * refusal carries is read off the children the walk actually tried. A child the walk simply ran out
 * of attempts before reaching is named by nobody here, because the table still reaches it and the
 * very next request will.
 */
function accountOfAWalkThatServedNobody(walking: Walking): readonly WalkNote[] {
  const walkedPast = reasonsTheDecisionsLeave(walking);

  return notesOverTheTable(walking, (routeNode) =>
    noteForTargetWalkedPast(walking, routeNode, walkedPast),
  );
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

  const retryAtMs = retryTimeEveryTriedChildPromised(notes);

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

  if (settled !== undefined) return { notes: notesOfTheWalk(walking), verdict: settled };

  const notes = accountOfAWalkThatServedNobody(walking);

  return { notes, verdict: verdictWhenNoChildServed(walking, notes) };
}
