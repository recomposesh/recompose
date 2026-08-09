type JsonObject = Record<string, unknown>;

const REMOVED_FIELDS = [
  'previous_response_id',
  'generate',
  'prompt_cache_retention',
  'safety_identifier',
  'stream_options',
  'max_output_tokens',
  'max_completion_tokens',
  'temperature',
  'top_p',
  'truncation',
  'user',
  'context_management',
] as const;

export function removeUnsupportedCodexFields(body: JsonObject): void {
  for (const field of REMOVED_FIELDS) delete body[field];
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function preservedCodexStreamOptions(
  body: JsonObject,
): { reasoning_summary_delivery: unknown } | undefined {
  const streamOptions = body['stream_options'];

  if (!isJsonObject(streamOptions)) return undefined;

  const delivery = streamOptions['reasoning_summary_delivery'];

  return delivery === undefined ? undefined : { reasoning_summary_delivery: delivery };
}
