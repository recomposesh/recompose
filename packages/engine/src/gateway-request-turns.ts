import type { JsonObject } from './json-object';

import { isJsonObject } from './json-object';

function textOfBlocks(blocks: readonly unknown[]): string {
  const said: string[] = [];

  for (const block of blocks) {
    const text = textInside(block);

    if (text !== '') said.push(text);
  }

  return said.join('\n');
}

function textInside(value: unknown): string {
  if (typeof value === 'string') return value;

  if (Array.isArray(value)) return textOfBlocks(value);

  if (!isJsonObject(value)) return '';

  const text = value['text'];

  return typeof text === 'string' ? text : '';
}

/**
 * The fields that carry standing instructions rather than anything a caller said this turn.
 *
 * @summary A Gemini instruction wears the very shape of a turn, parts and all, and this gateway's
 * own subscription path stamps role user onto it, so nothing inside the object tells it apart from
 * a turn. The field name is the only honest signal, and both spellings reach the wire.
 */
const INSTRUCTION_FIELDS = new Set(['systemInstruction', 'system_instruction']);

function isCallerTurn(value: JsonObject): boolean {
  return value['role'] === 'user' || (value['role'] === undefined && 'parts' in value);
}

function spokenByTheCaller(turn: JsonObject, spoken: string[]): void {
  const said = textInside(turn['content'] ?? turn['parts']);

  if (said !== '') spoken.push(said);
}

function spokenIn(value: unknown, spoken: string[]): void {
  if (Array.isArray(value)) {
    for (const held of value) spokenIn(held, spoken);
  } else if (isJsonObject(value)) {
    spokenInObject(value, spoken);
  }
}

function spokenInObject(value: JsonObject, spoken: string[]): void {
  if (isCallerTurn(value)) {
    spokenByTheCaller(value, spoken);

    return;
  }

  for (const [field, held] of Object.entries(value)) {
    if (!INSTRUCTION_FIELDS.has(field)) spokenIn(held, spoken);
  }
}

/**
 * What the caller said, turn by turn, whichever of the five request shapes carried it.
 *
 * @summary The scan runs over the whole body rather than one dialect's field, because the same
 * conversation reaches the gateway through five shapes and neither the branch a judge reads nor the
 * conversation a pin recognizes may depend on which one a client happened to open with. Only turns
 * the caller spoke are collected: a system prompt carries per-turn stamps in the field, so a
 * fingerprint taken over it would name a fresh conversation every turn, and a judge reading it would
 * classify the tool rather than the request. Which of those two goes wrong is decided by nothing
 * better than the order a client serialized its fields in, so the instruction is passed over by
 * name rather than by anything read off the object it holds.
 */
export function userTurnsOf(raw: JsonObject): readonly string[] {
  const spoken: string[] = [];

  spokenIn(raw, spoken);

  return spoken;
}
