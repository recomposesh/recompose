import type { JsonObject } from '../gateway-wire';

import { isJsonObject } from '../gateway-wire';

const CACHE_CONTROL = 'cache_control';

function withoutCacheControl(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(withoutCacheControl);
  }

  if (!isJsonObject(value)) {
    return value;
  }

  const kept: JsonObject = {};

  for (const [key, held] of Object.entries(value)) {
    if (key !== CACHE_CONTROL) kept[key] = withoutCacheControl(held);
  }

  return kept;
}

/**
 * One turn as Groq will take it.
 *
 * @summary `cache_control` is Anthropic's own extension, and a caller speaking that dialect carries
 * it on any block it wants held. Groq validates its messages strictly and refuses the whole request
 * over the field rather than passing it by, so it comes off here. Nothing is lost by dropping it:
 * the field asks a vendor to cache, and a vendor that refuses to read it was never going to.
 */
export function groqProviderBody(body: JsonObject): JsonObject {
  const stripped = withoutCacheControl(body);

  return isJsonObject(stripped) ? stripped : body;
}
