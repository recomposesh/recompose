import type { Context } from 'hono';

import type { GeminiRefusal } from './gemini-refusal';
import type { AnthropicRefusal } from './refusals';

import { noteTurnedAway } from './gateway-traffic';

type EdgeStatus = 401 | 403 | 404;

/**
 * The one seam a rejection raised at the gateway's edge crosses to become an answer.
 *
 * @summary Every guard and every unserved path pass here, so a rejection cannot reach a caller
 * without also reaching the log, and the sentence the row carries is the one the caller was handed
 * rather than a second copy written from the status.
 *
 * The two envelopes are the only two the edge can know. A guard and a path nobody serves answer the
 * Anthropic shape because nothing has named the caller's dialect yet and a path the gateway does not
 * serve never will. A caller that reached a dialect's own route named it by arriving, and hands its
 * refusal in already shaped.
 */
export function turnedAway(
  c: Context,
  refusal: AnthropicRefusal | GeminiRefusal,
  status: EdgeStatus,
  headers: Record<string, string> = {},
): Response {
  noteTurnedAway(status, refusal.error.message);

  return c.json(refusal, status, headers);
}
