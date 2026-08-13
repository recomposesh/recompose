import type { JsonObject } from '../gateway-wire';

import { isJsonObject } from '../gateway-wire';

function thinkingIsOn(body: JsonObject): boolean {
  const thinking = body['thinking'];
  const type = isJsonObject(thinking) ? thinking['type'] : undefined;

  return type === 'enabled' || type === 'adaptive' || type === 'auto';
}

/**
 * The same body with only the sampling knobs the native Claude wire refuses taken away.
 *
 * @summary Anthropic rejects `top_p` beside `temperature`, and rejects either one while thinking
 * is on. It takes the rest, so dropping them all would quietly discard a caller's own setting for
 * no upstream reason.
 */
export function normalizedClaudeSampling(body: JsonObject): JsonObject {
  if (thinkingIsOn(body)) {
    const { temperature: _temperature, top_p: _topP, ...rest } = body;

    return rest;
  }

  if (body['temperature'] === undefined || body['top_p'] === undefined) return body;

  const { top_p: _dropped, ...kept } = body;

  return kept;
}
