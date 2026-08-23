import type { JsonObject } from '../gateway-wire';

const OUTPUT_FIELDS = ['max_tokens', 'max_completion_tokens'] as const;

function cappedField(body: JsonObject, field: string, ceiling: number): JsonObject {
  const requested = body[field];

  if (typeof requested !== 'number' || requested <= ceiling) return body;

  return { ...body, [field]: ceiling };
}

/**
 * The turn brought down to the output its target model will take.
 *
 * @summary A caller writes `max_tokens` for the model it thinks it is talking to, and a virtual
 * model may send that turn to an upstream whose ceiling is far lower. Groq refuses the whole turn
 * over the number rather than clamping it. The ceiling is the vendor's own, read off its catalog
 * before the turn was worded, so nothing here has a table to keep in step. A model the vendor
 * stated no ceiling for goes out as the caller wrote it, because inventing one would truncate an
 * answer the vendor was willing to finish.
 */
export function cappedOutput(body: JsonObject, ceiling: number | undefined): JsonObject {
  if (ceiling === undefined) return body;

  return OUTPUT_FIELDS.reduce((held, field) => cappedField(held, field, ceiling), body);
}
