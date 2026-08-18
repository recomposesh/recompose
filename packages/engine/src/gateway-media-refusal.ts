import type { OpenAiCode } from './refusal-wire';

import { jsonResponse } from './gateway-wire';
import { gatewayRefusedWith } from './provider/serving-turn';
import { bodyInDialect } from './refusal-bodies';

type MediaStatus = 400 | 404;

/**
 * How a drawing or filming route refuses, in the envelope its caller already speaks.
 *
 * @summary These routes read no dialect from the request, because the paths are OpenAI's own and a
 * client of those paths parses one shape. Both refuse through here rather than each spelling its own
 * envelope, which is what stops a media refusal reading unlike every other refusal the gateway
 * raises, and what lets the row carry the sentence the caller was actually given.
 */
export function mediaRefusal(
  message: string,
  code: OpenAiCode,
  status: MediaStatus = 400,
): Response {
  gatewayRefusedWith(message);

  return jsonResponse(
    bodyInDialect('chat-completions', {
      status,
      message,
      code,
      anthropicType: 'invalid_request_error',
    }),
    status,
  );
}
