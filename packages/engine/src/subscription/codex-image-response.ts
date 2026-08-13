import type { JsonObject } from '../gateway-wire';
import type { CodexImageExtraction, CodexImageResult } from './codex-image-results';

import { isJsonObject, jsonResponse } from '../gateway-wire';
import { jsonEventsFrom, namedSseBodyFrom } from '../stream-wire';
import { extractCodexImageResults } from './codex-image-results';

type CollectedImages = { indexed: Map<number, JsonObject>; fallback: JsonObject[] };

const FAILURE_EVENTS = new Set(['response.failed', 'response.incomplete', 'error']);

const OPAQUE_FAILURE = 'the upstream request failed';

function sanitizedFailureMessage(error: JsonObject): string {
  const message = error['message'];

  return typeof message === 'string' && message.trim() !== '' ? message : OPAQUE_FAILURE;
}

/**
 * The refusal an upstream failure event carries, or nothing where the event names none.
 *
 * @summary Only the message and the code cross back to the caller. Everything else an upstream
 * puts on the error is its own diagnostic, and forwarding it would hand a caller internals they
 * cannot act on and should not read.
 */
function failureFrom(event: JsonObject): JsonObject | null {
  if (!FAILURE_EVENTS.has(String(event['type']))) return null;

  const response = isJsonObject(event['response']) ? event['response'] : event;
  const error = isJsonObject(response['error']) ? response['error'] : {};
  const code = error['code'];

  return {
    message: sanitizedFailureMessage(error),
    ...(typeof code === 'string' ? { code } : {}),
  };
}

function failureResponse(failure: JsonObject): Response {
  return jsonResponse({ error: failure }, 400);
}

const EMPTY_IMAGE_RESULT: CodexImageResult = {
  result: '',
  revisedPrompt: '',
  outputFormat: '',
  size: '',
  background: '',
  quality: '',
};

function collectItem(event: JsonObject, collected: CollectedImages): void {
  if (event['type'] !== 'response.output_item.done' || !isJsonObject(event['item'])) return;

  const index = event['output_index'];

  if (typeof index === 'number') collected.indexed.set(index, event['item']);
  else collected.fallback.push(event['item']);
}

function mimeType(format: string): string {
  if (['jpg', 'jpeg'].includes(format.trim().toLowerCase())) return 'image/jpeg';

  return format.trim().toLowerCase() === 'webp' ? 'image/webp' : 'image/png';
}

function imageValue(result: CodexImageResult, responseFormat: string): JsonObject {
  const output =
    responseFormat.trim().toLowerCase() === 'url'
      ? { url: `data:${mimeType(result.outputFormat)};base64,${result.result}` }
      : { b64_json: result.result };

  return {
    ...output,
    ...(result.revisedPrompt === '' ? {} : { revised_prompt: result.revisedPrompt }),
  };
}

function optionalText(field: string, value: string): JsonObject {
  return value === '' ? {} : { [field]: value };
}

function imageMetadata(meta: CodexImageResult | undefined): JsonObject {
  const value = meta ?? EMPTY_IMAGE_RESULT;

  return {
    ...optionalText('background', value.background),
    ...optionalText('output_format', value.outputFormat),
    ...optionalText('quality', value.quality),
    ...optionalText('size', value.size),
  };
}

function imageApiBody(extraction: CodexImageExtraction, responseFormat: string): JsonObject {
  return {
    created: extraction.createdAt,
    data: extraction.results.map((result) => imageValue(result, responseFormat)),
    ...imageMetadata(extraction.firstMeta),
    ...(extraction.usage === undefined ? {} : { usage: extraction.usage }),
  };
}

function partialResult(event: JsonObject): string {
  return typeof event['partial_image_b64'] === 'string' ? event['partial_image_b64'] : '';
}

function partialIndex(event: JsonObject): number {
  return typeof event['partial_image_index'] === 'number' ? event['partial_image_index'] : 0;
}

function partialFormat(event: JsonObject): string {
  return typeof event['output_format'] === 'string' ? event['output_format'] : '';
}

function partialEvent(
  event: JsonObject,
  prefix: string,
  responseFormat: string,
): JsonObject | null {
  if (event['type'] !== 'response.image_generation_call.partial_image') return null;

  const result = partialResult(event);

  if (result.trim() === '') return null;

  return {
    type: `${prefix}.partial_image`,
    partial_image_index: partialIndex(event),
    ...imageValue(
      {
        result,
        revisedPrompt: '',
        outputFormat: partialFormat(event),
        size: '',
        background: '',
        quality: '',
      },
      responseFormat,
    ),
  };
}

function completedEvents(
  event: JsonObject,
  collected: CollectedImages,
  prefix: string,
  responseFormat: string,
): JsonObject[] {
  if (event['type'] !== 'response.completed') return [];

  const extraction = extractCodexImageResults(event, collected.indexed, collected.fallback);

  return extraction.results.map((result) => ({
    type: `${prefix}.completed`,
    ...imageValue(result, responseFormat),
    ...(extraction.usage === undefined ? {} : { usage: extraction.usage }),
  }));
}

function* imageEventsOf(
  event: JsonObject & { type: string },
  collected: CollectedImages,
  prefix: string,
  responseFormat: string,
): Iterable<JsonObject & { type: string }> {
  const partial = partialEvent(event, prefix, responseFormat);

  if (partial !== null && typeof partial['type'] === 'string') {
    yield { ...partial, type: partial['type'] };
  }

  for (const completed of completedEvents(event, collected, prefix, responseFormat)) {
    yield { ...completed, type: String(completed['type']) };
  }
}

async function* imageEvents(
  body: ReadableStream<Uint8Array>,
  prefix: string,
  responseFormat: string,
): AsyncIterable<JsonObject & { type: string }> {
  const collected: CollectedImages = { indexed: new Map(), fallback: [] };

  for await (const event of jsonEventsFrom(body)) {
    collectItem(event, collected);

    const failure = failureFrom(event);

    if (failure !== null) {
      yield { type: `${prefix}.error`, error: failure };

      return;
    }

    yield* imageEventsOf(event, collected, prefix, responseFormat);
  }
}

export function codexImageStreamResponse(
  answer: Response,
  prefix: string,
  responseFormat: string,
): Response {
  if (!answer.ok || answer.body === null) return answer;

  return new Response(namedSseBodyFrom(imageEvents(answer.body, prefix, responseFormat)), {
    status: answer.status,
    headers: { 'content-type': 'text/event-stream' },
  });
}

function settledImageAnswer(
  event: JsonObject & { type: string },
  collected: CollectedImages,
  responseFormat: string,
): Response | null {
  const failure = failureFrom(event);

  if (failure !== null) return failureResponse(failure);

  return completedImageBody(event, collected, responseFormat);
}

function completedImageBody(
  event: JsonObject & { type: string },
  collected: CollectedImages,
  responseFormat: string,
): Response | null {
  if (event.type !== 'response.completed') return null;

  const extraction = extractCodexImageResults(event, collected.indexed, collected.fallback);

  return jsonResponse(imageApiBody(extraction, responseFormat), 200);
}

export async function codexImageJsonResponse(
  answer: Response,
  responseFormat: string,
): Promise<Response> {
  if (!answer.ok || answer.body === null) return answer;

  const collected: CollectedImages = { indexed: new Map(), fallback: [] };

  for await (const event of jsonEventsFrom(answer.body)) {
    collectItem(event, collected);

    const settled = settledImageAnswer(event, collected, responseFormat);

    if (settled !== null) return settled;
  }

  return Response.json(
    { error: { message: 'upstream did not return image output' } },
    { status: 502 },
  );
}
