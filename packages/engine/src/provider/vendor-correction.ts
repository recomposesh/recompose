import type { JsonObject } from '../gateway-wire';

import { isJsonObject } from '../gateway-wire';

const AFFORDABLE = /can only afford (\d+)/u;

const CORRECTABLE: ReadonlySet<number> = new Set([400, 402]);

const TOOL_FIELDS = ['tools', 'tool_choice'] as const;

const OUTPUT_FIELDS = ['max_tokens', 'max_completion_tokens'] as const;

/**
 * @summary Only a refusal this module knows a remedy for is worth reading a body for, and a body
 * still streaming would otherwise be waited on for a remedy that was never going to be in it.
 */
export function refusalIsCorrectable(status: number): boolean {
  return CORRECTABLE.has(status);
}

/**
 * The same turn reworded the way the vendor's own refusal said it would take it, or nothing.
 *
 * @summary A vendor that refuses over a number it names is telling the gateway how to word the turn
 * it would have served, and OpenRouter prices a turn against the credit an account actually holds
 * rather than against the model. A free account asking for the ceiling its client always asks for
 * is refused outright, where the smaller answer it can afford would have been served. Only a
 * refusal naming its own remedy is corrected, and only once, so a vendor that refuses for any other
 * reason still reaches the caller as it wrote it.
 */
export function correctedForVendor(
  status: number,
  refusal: unknown,
  body: JsonObject,
): JsonObject | null {
  if (!refusalIsCorrectable(status)) return null;
  if (refusesToolCalling(refusal)) return withoutTools(body);

  const affordable = affordableIn(refusal);

  return affordable === null ? null : cappedAt(body, affordable);
}

/**
 * @summary A model that answers no tool call refuses the whole turn over the field rather than
 * ignoring it, and names the field it refused. Sending the turn again without tools is the only
 * answer that model was ever going to give, so it is sent rather than the refusal reaching a
 * caller that would have read it as the gateway being broken.
 */
function refusesToolCalling(refusal: unknown): boolean {
  if (!isJsonObject(refusal) || !isJsonObject(refusal['error'])) return false;

  return refusal['error']['param'] === 'tool calling';
}

function withoutTools(body: JsonObject): JsonObject | null {
  if (!TOOL_FIELDS.some((field) => field in body)) return null;

  const kept: JsonObject = { ...body };

  for (const field of TOOL_FIELDS) delete kept[field];

  return kept;
}

function affordableIn(refusal: unknown): number | null {
  if (!isJsonObject(refusal) || !isJsonObject(refusal['error'])) return null;

  const error = refusal['error'];

  if (!namesItsOwnCredit(error['metadata'])) return null;

  const said = error['message'];

  return typeof said === 'string' ? affordableTokens(said) : null;
}

function namesItsOwnCredit(metadata: unknown): boolean {
  return isJsonObject(metadata) && metadata['limit_source'] === 'openrouter_credits';
}

function affordableTokens(message: string): number | null {
  const found = AFFORDABLE.exec(message)?.[1];

  return found === undefined ? null : Number(found);
}

function cappedAt(body: JsonObject, affordable: number): JsonObject | null {
  const field = OUTPUT_FIELDS.find((named) => oversized(body[named], affordable));

  return field === undefined ? null : { ...body, [field]: affordable };
}

function oversized(asked: unknown, affordable: number): boolean {
  return typeof asked === 'number' && asked > affordable;
}
