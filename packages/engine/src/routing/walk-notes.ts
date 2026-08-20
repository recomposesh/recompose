import type { AttemptReason } from './outcome-classification';

/** Why one child of a route table did not serve a request, whether it was tried or stood cooling. */
export type NoteReason = AttemptReason | { because: 'cooling' };

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
