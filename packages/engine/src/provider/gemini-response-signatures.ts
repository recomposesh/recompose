import type { JsonObject } from '../gateway-wire';

import { isJsonObject } from '../gateway-wire';

const SIGNATURE_FIELDS = ['thoughtSignature', 'thought_signature'] as const;

function answersATool(part: JsonObject): boolean {
  return part['functionResponse'] !== undefined;
}

function carriesASignature(part: JsonObject): boolean {
  return SIGNATURE_FIELDS.some((field) => part[field] !== undefined);
}

function withoutSignature(part: JsonObject): JsonObject {
  const { thoughtSignature: _signed, thought_signature: _spelled, ...rest } = part;

  return rest;
}

function partsUpstreamWillTake(parts: readonly unknown[]): readonly unknown[] {
  const cleaned = parts.map((part) =>
    isJsonObject(part) && answersATool(part) && carriesASignature(part)
      ? withoutSignature(part)
      : part,
  );

  return cleaned.every((part, index) => part === parts[index]) ? parts : cleaned;
}

function turnUpstreamWillTake(turn: unknown): unknown {
  if (!isJsonObject(turn) || !Array.isArray(turn['parts'])) return turn;

  const parts: unknown[] = turn['parts'];
  const taken = partsUpstreamWillTake(parts);

  return taken === parts ? turn : { ...turn, parts: taken };
}

/**
 * The turns with every signature Gemini refuses to replay taken off them.
 *
 * @summary A `functionResponse` part carries no thought of its own, and Gemini rejects the whole
 * request when one arrives signed. A conversation adopted from a tool that signs its tool answers
 * therefore cannot be continued at all until the signature comes off. Only that one placement is
 * touched, because a signature on the model's own thought is what replay depends on.
 */
export function geminiSignaturesUpstreamWillTake(body: JsonObject): JsonObject {
  const contents = body['contents'];

  if (!Array.isArray(contents)) return body;

  const turns: unknown[] = contents;
  const taken = turns.map(turnUpstreamWillTake);

  return taken.every((turn, index) => turn === turns[index]) ? body : { ...body, contents: taken };
}
