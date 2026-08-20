import type { AttemptReason } from './outcome-classification';

/**
 * Why one child of a route table did not serve a request.
 *
 * @summary Three ways, not two: it was tried and refused, it stood cooling from an earlier
 * refusal, or a branch this request was judged onto left it out of reach while it stood perfectly
 * ready. The third is the only one that promises nothing about when to come back, because the next
 * request may well be judged straight onto it.
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

/**
 * The soonest a whole set of notes promises anything, or nothing if any note promised nothing.
 *
 * @summary A refusal tells a caller when to come back only when every child it walked past named a
 * time, because the one child that named none could recover at any moment and a promise built
 * around the rest would be a guess wearing a number.
 */
export function retryTimeEveryNotePromised(notes: readonly WalkNote[]): number | undefined {
  const promised: number[] = [];

  for (const note of notes) {
    if (note.retryAtMs === undefined) return undefined;

    promised.push(note.retryAtMs);
  }

  return promised.length === 0 ? undefined : Math.min(...promised);
}
