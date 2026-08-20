import { createHash } from 'node:crypto';

import type { Crossing } from './gateway-wire';

import { userTurnsOf } from './gateway-request-turns';

const MARK_CHARS = 32;

function markOfTheOpening(opening: string): string {
  return `opening:${createHash('sha256').update(opening).digest('hex').slice(0, MARK_CHARS)}`;
}

/**
 * The mark one conversation is recognized by across the turns it takes.
 *
 * @summary A key the client sent wins, because a client that names its own conversation knows where
 * one ends better than any reading of the words could, and the same key already scopes replay and
 * prompt caching here. Without one the mark comes from the opening turn alone: everything else in a
 * request moves. A system prompt carries the clock and the working directory, the transcript grows
 * every turn, and a mark taken over either would name a fresh conversation each time and rejudge a
 * request that had already earned its branch. The two sources are kept apart in the mark itself, so
 * a client key can never read as the hash of somebody else's opening words.
 */
export function conversationFingerprint(crossing: Crossing): string {
  const client = crossing.sessionId;

  if (client !== undefined) return `client:${client}`;

  return markOfTheOpening(userTurnsOf(crossing.raw).at(0) ?? '');
}
