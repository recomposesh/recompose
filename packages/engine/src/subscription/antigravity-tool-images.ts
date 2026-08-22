import type { JsonObject } from '../gateway-wire';

import { isJsonObject } from '../gateway-wire';

const ASSUMED_MEDIA_TYPE = 'image/png';

type InlineData = { mimeType: string; data: string };

function named(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

function mediaTypeOf(inline: JsonObject): string {
  return named(inline['mimeType']) ?? named(inline['mime_type']) ?? ASSUMED_MEDIA_TYPE;
}

function inlineDataIn(part: JsonObject): InlineData | undefined {
  const inline = part['inlineData'] ?? part['inline_data'];

  if (!isJsonObject(inline)) return undefined;

  const data = named(inline['data']);

  return data === undefined ? undefined : { mimeType: mediaTypeOf(inline), data };
}

function answersATool(part: unknown): part is JsonObject & { functionResponse: JsonObject } {
  return isJsonObject(part) && isJsonObject(part['functionResponse']);
}

function answerHolding(part: JsonObject, images: readonly InlineData[]): JsonObject {
  const response = part['functionResponse'];

  if (images.length === 0 || !isJsonObject(response)) return part;

  const held: unknown[] = Array.isArray(response['parts']) ? response['parts'] : [];
  const arriving = images.map((image) => ({ inlineData: image }));

  return {
    ...part,
    functionResponse: { ...response, parts: [...held, ...arriving] },
  };
}

type Gathering = { answers: JsonObject[]; held: InlineData[][]; waiting: InlineData[] };

function tookTheAnswer(state: Gathering, part: JsonObject): void {
  state.answers.push(part);
  state.held.push(state.waiting);
  state.waiting = [];
}

function tookTheImage(state: Gathering, part: unknown): void {
  const image = isJsonObject(part) ? inlineDataIn(part) : undefined;

  if (image !== undefined) (state.held.at(-1) ?? state.waiting).push(image);
}

function gathered(parts: readonly unknown[]): Gathering {
  const state: Gathering = { answers: [], held: [], waiting: [] };

  for (const part of parts) {
    if (answersATool(part)) tookTheAnswer(state, part);
    else tookTheImage(state, part);
  }

  return state;
}

function partsWithImagesNested(parts: readonly unknown[]): readonly unknown[] {
  const { answers, held } = gathered(parts);

  return answers.length === 0
    ? parts
    : answers.map((answer, place) => answerHolding(answer, held[place] ?? []));
}

function turnWithImagesNested(turn: unknown): unknown {
  if (!isJsonObject(turn) || !Array.isArray(turn['parts'])) return turn;

  const parts: unknown[] = turn['parts'];
  const nested = partsWithImagesNested(parts);

  return nested === parts ? turn : { ...turn, parts: nested };
}

/**
 * The turns with every tool image standing inside the answer it belongs to.
 *
 * @summary Cloud Code Assist reads an image only where it sits under `functionResponse.parts` with
 * a media type named, so an image emitted beside its answer is one the model never sees. Each image
 * joins the nearest answer before it rather than the last in the turn, because a turn carrying
 * several parallel tool results would otherwise hand every screenshot to whichever tool answered
 * last. An image arriving before any answer joins the first, since it can belong to nothing else.
 */
export function antigravityToolImagesNested(body: JsonObject): JsonObject {
  const contents = body['contents'];

  if (!Array.isArray(contents)) return body;

  const turns: unknown[] = contents;
  const nested = turns.map(turnWithImagesNested);

  return nested.every((turn, index) => turn === turns[index])
    ? body
    : { ...body, contents: nested };
}
