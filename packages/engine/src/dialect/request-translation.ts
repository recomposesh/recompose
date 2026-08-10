import type { Dialect, TranslationRefusal } from '../refusals';
import type { AnthropicRequest } from './anthropic-wire';
import type { ChatCompletionsRequest } from './chat-completions-wire';
import type { TranslateResult } from './fates';
import type { GeminiRequest } from './gemini-wire';
import type { HubRequest } from './hub';
import type { InteractionsRequest } from './interactions-wire';
import type { ResponsesRequest } from './responses-wire';

import {
  decodeRequest as anthropicDecodeRequest,
  encodeRequest as anthropicEncodeRequest,
} from './anthropic-codec';
import { decodeRequestWithCompat as anthropicDecodeRequestWithCompat } from './anthropic-request-decode';
import { anthropicRequestForResponses } from './anthropic-responses-request';
import {
  decodeRequest as chatDecodeRequest,
  encodeRequest as chatEncodeRequest,
} from './chat-completions-codec';
import { decodeRequestWithCompat as chatDecodeRequestWithCompat } from './chat-completions-request-decode';
import { encodeRequestWithoutCompat as chatEncodeRequestWithoutCompat } from './chat-completions-request-encode';
import { normalizeChatHistoryForResponses } from './chat-completions-responses-history';
import {
  decodeRequest as geminiDecodeRequest,
  encodeRequest as geminiEncodeRequest,
} from './gemini-codec';
import {
  decodeRequest as interactionsDecodeRequest,
  encodeRequest as interactionsEncodeRequest,
} from './interactions-codec';
import {
  decodeRequest as responsesDecodeRequest,
  encodeRequest as responsesEncodeRequest,
} from './responses-codec';
import {
  decodeRequestForChat as responsesDecodeRequestForChat,
  decodeRequestWithCompat as responsesDecodeRequestWithCompat,
} from './responses-request';
import { requestHubForTarget } from './target-request-hub';
import { composeThroughHub, sameDialect } from './translation-composition';

export type RequestOf = {
  anthropic: AnthropicRequest;
  'chat-completions': ChatCompletionsRequest;
  gemini: GeminiRequest;
  interactions: InteractionsRequest;
  responses: ResponsesRequest;
};

type Passthrough = { outcome: 'passthrough' };
export type RequestTranslation<To extends Dialect> =
  | Passthrough
  | TranslateResult<RequestOf[To], TranslationRefusal>;

type RequestDecoders = {
  [D in Dialect]: (body: RequestOf[D]) => TranslateResult<HubRequest, TranslationRefusal>;
};

type RequestEncoders = {
  [D in Dialect]: (hub: HubRequest) => TranslateResult<RequestOf[D], TranslationRefusal>;
};

type RequestMode = {
  decoders: RequestDecoders;
  targeted: Partial<Record<Dialect, RequestDecoders>>;
};

const requestDecoders: RequestDecoders = {
  anthropic: anthropicDecodeRequest,
  'chat-completions': chatDecodeRequest,
  gemini: geminiDecodeRequest,
  interactions: interactionsDecodeRequest,
  responses: responsesDecodeRequest,
};

const compatibleRequestDecoders: RequestDecoders = {
  ...requestDecoders,
  anthropic: anthropicDecodeRequestWithCompat,
  'chat-completions': chatDecodeRequestWithCompat,
  responses: responsesDecodeRequestWithCompat,
};

const requestEncoders: RequestEncoders = {
  anthropic: anthropicEncodeRequest,
  'chat-completions': chatEncodeRequest,
  gemini: geminiEncodeRequest,
  interactions: interactionsEncodeRequest,
  responses: responsesEncodeRequest,
};

const responsesTargetRequestDecoders: RequestDecoders = {
  ...requestDecoders,
  'chat-completions': (body) => chatDecodeRequest(normalizeChatHistoryForResponses(body)),
};

const compatibleResponsesTargetRequestDecoders: RequestDecoders = {
  ...compatibleRequestDecoders,
  'chat-completions': (body) => chatDecodeRequestWithCompat(normalizeChatHistoryForResponses(body)),
};

const chatTargetRequestDecoders: RequestDecoders = {
  ...requestDecoders,
  responses: responsesDecodeRequestForChat,
};

const compatibleChatTargetRequestDecoders: RequestDecoders = {
  ...compatibleRequestDecoders,
  responses: responsesDecodeRequestForChat,
};

const nativeMode: RequestMode = {
  decoders: requestDecoders,
  targeted: {
    'chat-completions': chatTargetRequestDecoders,
    responses: responsesTargetRequestDecoders,
  },
};

const compatibleMode: RequestMode = {
  decoders: compatibleRequestDecoders,
  targeted: {
    'chat-completions': compatibleChatTargetRequestDecoders,
    responses: compatibleResponsesTargetRequestDecoders,
  },
};

const nativeAnthropicRequestEncoders: RequestEncoders = {
  ...requestEncoders,
  'chat-completions': chatEncodeRequestWithoutCompat,
};

const compatibleAnthropicRequestEncoders: RequestEncoders = {
  ...requestEncoders,
  'chat-completions': chatEncodeRequest,
};

function requestEncodersFor(from: Dialect, isCompat: boolean): RequestEncoders {
  if (from !== 'anthropic') return requestEncoders;

  return isCompat ? compatibleAnthropicRequestEncoders : nativeAnthropicRequestEncoders;
}

function modeFor(isCompat: boolean): RequestMode {
  return isCompat ? compatibleMode : nativeMode;
}

function requestModel(body: RequestOf[Dialect]): string | undefined {
  return typeof body.model === 'string' ? body.model : undefined;
}

function contextualRequest<From extends Dialect>(
  from: From,
  to: Dialect,
  body: RequestOf[From],
  decoded: TranslateResult<HubRequest, TranslationRefusal>,
): TranslateResult<HubRequest, TranslationRefusal> {
  const targeted = requestHubForTarget(from, to, decoded);

  return from === 'anthropic' && to === 'responses'
    ? anthropicRequestForResponses(targeted, requestModel(body))
    : targeted;
}

export function translateRequest<From extends Dialect, To extends Dialect>(
  from: From,
  to: To,
  body: RequestOf[From],
  options: { isCompat?: boolean } = {},
): RequestTranslation<To> {
  if (sameDialect(from, to)) return { outcome: 'passthrough' };

  const mode = modeFor(options.isCompat === true);
  const decoders = mode.targeted[to] ?? mode.decoders;
  const decode: (body: RequestOf[From]) => TranslateResult<HubRequest, TranslationRefusal> =
    decoders[from];
  const encode: (hub: HubRequest) => TranslateResult<RequestOf[To], TranslationRefusal> =
    requestEncodersFor(from, options.isCompat === true)[to];

  return composeThroughHub(contextualRequest(from, to, body, decode(body)), encode);
}
