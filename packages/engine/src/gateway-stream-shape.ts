import type { Crossing, ProviderDialect } from './gateway-wire';

import { chatSseUntilDone } from './chat-sse-hygiene';
import { answeringModelInto } from './dialect/anthropic-attribution';
import { respondingModelInto } from './dialect/responses-attribution';
import { answerStreamBody } from './gateway-answer-stream';
import { translatedStreamBody } from './gateway-stream-answers';
import { isJsonObject, parsedJson, refusalResponse } from './gateway-wire';
import { unstreamableAnswer } from './refusals';
import { jsonEventsFrom, namedSseBodyFrom } from './stream-wire';

export function sameDialectStreamBody(
  crossing: Crossing,
  body: ReadableStream<Uint8Array>,
): ReadableStream<Uint8Array> {
  if (crossing.dialect === 'chat-completions') return chatSseUntilDone(body);

  if (crossing.dialect === 'anthropic') {
    return namedSseBodyFrom(answeringModelInto(jsonEventsFrom(body), crossing.providerModel));
  }

  return crossing.dialect === 'responses'
    ? namedSseBodyFrom(respondingModelInto(jsonEventsFrom(body), crossing.virtualModel))
    : body;
}

export function sseAnswer(
  body: ReadableStream<Uint8Array>,
  status: number,
  attribution: Record<string, string>,
): Response {
  return new Response(body, {
    status,
    headers: { ...attribution, 'content-type': 'text/event-stream' },
  });
}

function streamOfText(text: string): ReadableStream<Uint8Array> {
  const bytes = new TextEncoder().encode(text);

  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

function carriesSseData(text: string): boolean {
  return text.split('\n').some((line) => line.startsWith('data:'));
}

function relabelledStream(
  crossing: Crossing,
  text: string,
  upstreamDialect: ProviderDialect,
): ReadableStream<Uint8Array> | null {
  if (!carriesSseData(text)) return null;

  const body = streamOfText(text);

  return crossing.dialect === upstreamDialect
    ? sameDialectStreamBody(crossing, body)
    : translatedStreamBody(upstreamDialect, crossing, body);
}

function synthesizedStream(
  crossing: Crossing,
  text: string,
  upstreamDialect: ProviderDialect,
): ReadableStream<Uint8Array> | null {
  const answer = parsedJson(text);

  return isJsonObject(answer) ? answerStreamBody(upstreamDialect, crossing, answer) : null;
}

function unstreamableRefusal(crossing: Crossing): Response {
  return refusalResponse(
    crossing.dialect,
    unstreamableAnswer(crossing.gatewayName, crossing.virtualModel, crossing.providerModel),
  );
}

export async function streamShapedAnswer(
  crossing: Crossing,
  upstream: Response,
  attribution: Record<string, string>,
  upstreamDialect: ProviderDialect,
): Promise<Response> {
  const text = await upstream.text();
  const body =
    relabelledStream(crossing, text, upstreamDialect) ??
    synthesizedStream(crossing, text, upstreamDialect);

  return body === null
    ? unstreamableRefusal(crossing)
    : sseAnswer(body, upstream.status, attribution);
}
