import type { AttemptReason } from './outcome-classification';

/**
 * Why a child a request never reached stood outside its way, told apart by what put it there.
 *
 * @summary A judgment naming another branch and a judge that named no branch at all leave the same
 * healthy child unused, and a person reading the refusal is owed the difference: the first is the
 * router working exactly as it was drawn, while the second is trouble at the judge that sent every
 * branch child's traffic to the else. One reason for each, so nothing has to guess which happened.
 */
export type OffBranchReason = { because: 'off-branch' } | { because: 'unjudged' };

/**
 * Why one child of a route table did not serve a request.
 *
 * @summary Four ways, not two: it was tried and refused, it stood cooling from an earlier refusal,
 * a branch this request was judged onto left it out of reach while it stood perfectly ready, or no
 * judgment placed the request at all and the else child took it. The last two promise nothing about
 * when to come back, because the next request may well be judged straight onto either, and they
 * withhold nothing either: no request ever reached them, so they have no say in the wait the
 * children the walk did try named.
 */
export type NoteReason = AttemptReason | { because: 'cooling' } | OffBranchReason;

/** What a walk records about one child it could not use, and when that child may serve again. */
export type WalkNote = { routeNode: string; reason: NoteReason; retryAtMs?: number };

/** One note, carrying a retry time only where the reason promised one. */
export function noteOf(
  routeNode: string,
  reason: NoteReason,
  retryAtMs: number | undefined,
): WalkNote {
  return retryAtMs === undefined ? { routeNode, reason } : { routeNode, reason, retryAtMs };
}

const STOOD_OFF_A_BRANCH = {
  'off-branch': true,
  unjudged: true,
} as const satisfies Record<OffBranchReason['because'], true>;

/** Whether the walk put one child to the test, by reaching it or by finding it already cooling. */
function theWalkTried(note: WalkNote): boolean {
  return !Object.hasOwn(STOOD_OFF_A_BRANCH, note.reason.because);
}

/**
 * The soonest the children a walk tried promise anything, or nothing where one of them promised none.
 *
 * @summary A refusal tells a caller when to come back only when every child it actually put to the
 * test named a time, because the one that named none could recover at any moment and a promise built
 * around the rest would be a guess wearing a number. A child standing off the branch never carried a
 * request, so it has no say here: letting it withhold the wait would strip the retry off a rate limit
 * every child the walk reached had promised, and hand the caller a bare failure it cannot time.
 */
export function retryTimeEveryTriedChildPromised(notes: readonly WalkNote[]): number | undefined {
  const promised: number[] = [];

  for (const note of notes.filter(theWalkTried)) {
    if (note.retryAtMs === undefined) return undefined;

    promised.push(note.retryAtMs);
  }

  return promised.length === 0 ? undefined : Math.min(...promised);
}
