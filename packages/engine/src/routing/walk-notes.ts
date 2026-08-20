import type { AttemptReason } from './outcome-classification';

/**
 * Why one child of a route table did not serve a request.
 *
 * @summary Three ways, not two: it was tried and refused, it stood cooling from an earlier
 * refusal, or a branch this request was judged onto left it out of reach while it stood perfectly
 * ready. The third promises nothing about when to come back, because the next request may well be
 * judged straight onto it, and it withholds nothing either: no request ever reached it, so it has
 * no say in the wait the children the walk did try named.
 */
export type NoteReason = AttemptReason | { because: 'cooling' } | { because: 'off-branch' };

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

/** Whether the walk put one child to the test, by reaching it or by finding it already cooling. */
function theWalkTried(note: WalkNote): boolean {
  return note.reason.because !== 'off-branch';
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
