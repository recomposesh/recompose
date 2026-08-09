import type { Dialect, TranslationRefusal } from '../refusals';
import type { AnthropicResponse, AnthropicStreamEvent } from './anthropic-wire';
import type { ChatCompletionsResponse, ChatStreamFrame } from './chat-completions-wire';
import type { TranslateResult } from './fates';
import type { GeminiResponse } from './gemini-wire';
import type { HubResponse, HubStreamEvent } from './hub';
import type { InteractionsResponse, InteractionsStreamEvent } from './interactions-wire';
import type { ResponsesResponse, ResponsesStreamEvent } from './responses-wire';

import {
  decodeResponse as anthropicDecodeResponse,
  decodeStream as anthropicDecodeStream,
  encodeResponse as anthropicEncodeResponse,
  encodeStream as anthropicEncodeStream,
} from './anthropic-codec';
import {
  decodeResponse as chatDecodeResponse,
  decodeStream as chatDecodeStream,
  encodeResponse as chatEncodeResponse,
  encodeStream as chatEncodeStream,
} from './chat-completions-codec';
import { decodeStreamForResponses as chatDecodeStreamForResponses } from './chat-completions-stream-decode';
import {
  decodeResponse as geminiDecodeResponse,
  decodeStream as geminiDecodeStream,
  encodeResponse as geminiEncodeResponse,
  encodeStream as geminiEncodeStream,
} from './gemini-codec';
import {
  decodeResponse as interactionsDecodeResponse,
  decodeStream as interactionsDecodeStream,
  encodeResponse as interactionsEncodeResponse,
  encodeStream as interactionsEncodeStream,
} from './interactions-codec';
import { responsesStreamForChat } from './responses-chat-custom-stream';
import {
  decodeResponse as responsesDecodeResponse,
  decodeStream as responsesDecodeStream,
  encodeResponse as responsesEncodeResponse,
  encodeStream as responsesEncodeStream,
} from './responses-codec';
import { targetStreamEvents } from './target-stream-events';
import { composeThroughHub, sameDialect } from './translation-composition';

export type { Dialect } from '../refusals';
export { translateRequest } from './request-translation';
export type { RequestOf, RequestTranslation } from './request-translation';

export type ResponseOf = {
  anthropic: AnthropicResponse;
  'chat-completions': ChatCompletionsResponse;
  gemini: GeminiResponse;
  interactions: InteractionsResponse;
  responses: ResponsesResponse;
};

export type StreamOf = {
  anthropic: AsyncIterable<AnthropicStreamEvent>;
  'chat-completions': AsyncIterable<ChatStreamFrame>;
  gemini: AsyncIterable<GeminiResponse>;
  interactions: AsyncIterable<InteractionsStreamEvent>;
  responses: AsyncIterable<ResponsesStreamEvent>;
};

type Passthrough = { outcome: 'passthrough' };
export type ResponseTranslation<To extends Dialect> =
  | Passthrough
  | TranslateResult<ResponseOf[To], TranslationRefusal>;
export type StreamTranslation<To extends Dialect> = Passthrough | { stream: StreamOf[To] };

type ResponseDecoders = {
  [D in Dialect]: (body: ResponseOf[D]) => TranslateResult<HubResponse, TranslationRefusal>;
};

type ResponseEncoders = {
  [D in Dialect]: (hub: HubResponse) => TranslateResult<ResponseOf[D], TranslationRefusal>;
};

type StreamDecoders = {
  [D in Dialect]: (source: StreamOf[D]) => AsyncIterable<HubStreamEvent>;
};

type StreamEncoders = {
  [D in Dialect]: (events: AsyncIterable<HubStreamEvent>) => StreamOf[D];
};

export const responseDecoders: ResponseDecoders = {
  anthropic: anthropicDecodeResponse,
  'chat-completions': chatDecodeResponse,
  gemini: geminiDecodeResponse,
  interactions: interactionsDecodeResponse,
  responses: responsesDecodeResponse,
};

const responseEncoders: ResponseEncoders = {
  anthropic: anthropicEncodeResponse,
  'chat-completions': chatEncodeResponse,
  gemini: geminiEncodeResponse,
  interactions: interactionsEncodeResponse,
  responses: responsesEncodeResponse,
};

const streamDecoders: StreamDecoders = {
  anthropic: anthropicDecodeStream,
  'chat-completions': chatDecodeStream,
  gemini: geminiDecodeStream,
  interactions: interactionsDecodeStream,
  responses: responsesDecodeStream,
};

const responsesTargetStreamDecoders: StreamDecoders = {
  ...streamDecoders,
  'chat-completions': chatDecodeStreamForResponses,
};

const chatTargetStreamDecoders: StreamDecoders = {
  ...streamDecoders,
  responses: decodeResponsesStreamForChat,
};

const targetedStreamDecoders: Partial<Record<Dialect, StreamDecoders>> = {
  responses: responsesTargetStreamDecoders,
  'chat-completions': chatTargetStreamDecoders,
};

function decodeResponsesStreamForChat(
  source: StreamOf['responses'],
): AsyncIterable<HubStreamEvent> {
  return responsesDecodeStream(responsesStreamForChat(source));
}

export const streamEncoders: StreamEncoders = {
  anthropic: anthropicEncodeStream,
  'chat-completions': chatEncodeStream,
  gemini: geminiEncodeStream,
  interactions: interactionsEncodeStream,
  responses: responsesEncodeStream,
};

export function translateResponse<From extends Dialect, To extends Dialect>(
  from: From,
  to: To,
  body: ResponseOf[From],
): ResponseTranslation<To> {
  if (sameDialect(from, to)) return { outcome: 'passthrough' };

  const decode: (body: ResponseOf[From]) => TranslateResult<HubResponse, TranslationRefusal> =
    responseDecoders[from];
  const encode: (hub: HubResponse) => TranslateResult<ResponseOf[To], TranslationRefusal> =
    responseEncoders[to];

  return composeThroughHub(decode(body), encode);
}

export function translateStream<From extends Dialect, To extends Dialect>(
  from: From,
  to: To,
  stream: StreamOf[From],
): StreamTranslation<To> {
  if (sameDialect(from, to)) return { outcome: 'passthrough' };

  const decoders = targetedStreamDecoders[to] ?? streamDecoders;
  const decode: (source: StreamOf[From]) => AsyncIterable<HubStreamEvent> = decoders[from];
  const encode: (events: AsyncIterable<HubStreamEvent>) => StreamOf[To] = streamEncoders[to];

  return { stream: encode(targetStreamEvents(from, to, decode(stream))) };
}
