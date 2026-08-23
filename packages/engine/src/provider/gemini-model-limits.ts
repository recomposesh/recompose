import type { JsonObject } from '../gateway-wire';

import { isJsonObject } from '../gateway-wire';

/**
 * The turn brought down to the output its Gemini model will take.
 *
 * @summary Gemini keeps the ask under `generationConfig`, which is the only thing that sets it
 * apart from every other vendor's ceiling. The number itself is read off the vendor's catalog
 * before the turn is worded, so nothing here has a table to keep in step with what Google ships.
 */
export function cappedGeminiOutput(body: JsonObject, ceiling: number | undefined): JsonObject {
  const generation = body['generationConfig'];

  if (!isJsonObject(generation) || ceiling === undefined) return body;

  const requested = generation['maxOutputTokens'];

  if (typeof requested !== 'number' || requested <= ceiling) return body;

  return { ...body, generationConfig: { ...generation, maxOutputTokens: ceiling } };
}
