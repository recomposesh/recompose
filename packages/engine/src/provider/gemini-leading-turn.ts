import type { JsonObject } from '../gateway-wire';

import { isJsonObject } from '../gateway-wire';

const EMPTY_USER_TURN = { role: 'user', parts: [{ text: '' }] };

/**
 * The turns as a Gemini upstream will take them, which never open on the model's own.
 *
 * @summary Gemini refuses a request whose first turn is the model's, and a conversation carried
 * in from another tool opens exactly that way: the person's opening turn lives in that tool's
 * history rather than in the request. An empty turn in front of it costs the answer nothing and is
 * what lets the carried conversation be answered at all. It stands here rather than in the
 * translator because it is what this upstream will accept rather than what the dialect means, and
 * a request already reaching it in Gemini's own spelling never passes through the translator.
 */
export function geminiTurnsUpstreamWillTake(body: JsonObject): JsonObject {
  const contents: unknown = body['contents'];

  if (!Array.isArray(contents)) return body;

  const turns: unknown[] = contents;
  const first = turns[0];

  return isJsonObject(first) && first['role'] === 'model'
    ? { ...body, contents: [EMPTY_USER_TURN, ...turns] }
    : body;
}
