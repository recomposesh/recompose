import type { TranslateResult } from './dialect/fates';
import type { HubResponse, HubStreamEvent } from './dialect/hub';
import type { Crossing, JsonObject, ProviderDialect } from './gateway-wire';
import type { TranslationRefusal } from './refusals';

import { responseDecoders, streamEncoders } from './dialect/dispatcher';
import { isGeminiResponse } from './dialect/gemini-bridge';
import { hubEventsOf, hubStreamFromResponse } from './dialect/hub-response-stream';
import { isResponsesAnswer } from './dialect/responses-answer-shape';
import {
  isAnthropicAnswer,
  isChatAnswer,
  isInteractionsAnswer,
} from './gateway-response-translation';
import { geminiSseBodyFrom } from './gemini-stream-wire';
import { chatSseBodyFrom, interactionSseBodyFrom, namedSseBodyFrom } from './stream-wire';

type DecodedAnswer = TranslateResult<HubResponse, TranslationRefusal> | null;

const answerDecoders: Record<ProviderDialect, (answer: JsonObject) => DecodedAnswer> = {
  'chat-completions': (answer) =>
    isChatAnswer(answer) ? responseDecoders['chat-completions'](answer) : null,
  anthropic: (answer) => (isAnthropicAnswer(answer) ? responseDecoders.anthropic(answer) : null),
  interactions: (answer) =>
    isInteractionsAnswer(answer) ? responseDecoders.interactions(answer) : null,
  gemini: (answer) => (isGeminiResponse(answer) ? responseDecoders.gemini(answer) : null),
  responses: (answer) => (isResponsesAnswer(answer) ? responseDecoders.responses(answer) : null),
};

function hubEventsFor(from: ProviderDialect, answer: JsonObject): HubStreamEvent[] | null {
  const decoded = answerDecoders[from](answer);

  if (decoded === null || 'refusal' in decoded) return null;

  return hubStreamFromResponse(decoded.value);
}

function encodedBody(
  crossing: Crossing,
  events: readonly HubStreamEvent[],
): ReadableStream<Uint8Array> {
  const source = hubEventsOf(events);

  if (crossing.dialect === 'chat-completions') {
    return chatSseBodyFrom(streamEncoders['chat-completions'](source));
  }

  if (crossing.dialect === 'interactions') {
    return interactionSseBodyFrom(streamEncoders.interactions(source));
  }

  if (crossing.dialect === 'gemini') {
    return geminiSseBodyFrom(streamEncoders.gemini(source));
  }

  return crossing.dialect === 'anthropic'
    ? namedSseBodyFrom(streamEncoders.anthropic(source))
    : namedSseBodyFrom(streamEncoders.responses(source));
}

export function answerStreamBody(
  from: ProviderDialect,
  crossing: Crossing,
  answer: JsonObject,
): ReadableStream<Uint8Array> | null {
  const events = hubEventsFor(from, answer);

  return events === null ? null : encodedBody(crossing, events);
}
