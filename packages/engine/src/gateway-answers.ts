import type { ResponsesResponse } from './dialect/responses-wire';
import type { Crossing, JsonObject, ProviderDialect } from './gateway-wire';
import type { AnthropicRefusal } from './refusals';

import { answeredBy } from './dialect/anthropic-attribution';
import { terminalResponseIn } from './dialect/responses-answer-shape';
import { attributedAnswer, restoredResponsesAnswer } from './gateway-answer-attribution';
import { isAnthropicAnswer, translatedResponse } from './gateway-response-translation';
import { translatedStreamBody } from './gateway-stream-answers';
import { sameDialectStreamBody, sseAnswer, streamShapedAnswer } from './gateway-stream-shape';
import {
  isJsonObject,
  jsonResponse,
  parsedJson,
  refusalResponse,
  wantsStream,
} from './gateway-wire';
import { gatewayRefusedWith } from './provider/serving-turn';
import { jsonEventsFrom } from './stream-wire';
import { codexTerminalErrorAnswer } from './subscription/codex-terminal-error';

function attributionOf(crossing: Crossing): Record<string, string> {
  return {
    'x-recompose-virtual-model': crossing.virtualModel,
    'x-recompose-target': crossing.providerModel,
  };
}

export function unreachableTargetMessage(crossing: Crossing): string {
  return `The gateway "${crossing.gatewayName}" could not reach the target for the virtual model "${crossing.virtualModel}".`;
}

function unreachableTargetBody(crossing: Crossing): unknown {
  if (crossing.dialect === 'anthropic') {
    const body: AnthropicRefusal = {
      type: 'error',
      error: { type: 'api_error', message: unreachableTargetMessage(crossing) },
    };

    return body;
  }

  return {
    error: {
      message: unreachableTargetMessage(crossing),
      type: 'api_error',
      param: null,
      code: 'target_unreachable',
    },
  };
}

export function unreachableTargetAnswer(crossing: Crossing): Response {
  gatewayRefusedWith(unreachableTargetMessage(crossing));

  return jsonResponse(unreachableTargetBody(crossing), 502, attributionOf(crossing));
}

function upstreamHeaders(upstream: Response, attribution: Record<string, string>): Headers {
  const headers = new Headers(attribution);

  for (const name of ['content-type', 'retry-after']) {
    const value = upstream.headers.get(name);

    if (value !== null) headers.set(name, value);
  }

  return headers;
}

function passedAlong(upstream: Response, attribution: Record<string, string>): Response {
  return new Response(upstream.body, {
    status: upstream.status,
    headers: upstreamHeaders(upstream, attribution),
  });
}

function carriesEventStream(upstream: Response): boolean {
  return upstream.headers.get('content-type')?.includes('text/event-stream') === true;
}

export async function answerFrom(
  crossing: Crossing,
  upstream: Response,
  upstreamDialect: ProviderDialect = 'chat-completions',
): Promise<Response> {
  const attribution = attributionOf(crossing);

  if (!upstream.ok) {
    return passedAlong(upstream, attribution);
  }

  if (carriesEventStream(upstream)) {
    return streamedAnswer(crossing, upstream, attribution, upstreamDialect);
  }

  return wantsStream(crossing.raw)
    ? streamShapedAnswer(crossing, upstream, attribution, upstreamDialect)
    : translatedAnswer(crossing, upstream, attribution, upstreamDialect);
}

async function streamedAnswer(
  crossing: Crossing,
  upstream: Response,
  attribution: Record<string, string>,
  upstreamDialect: ProviderDialect,
): Promise<Response> {
  if (needsCompletedResponses(upstreamDialect, crossing)) {
    return completedResponsesAnswer(crossing, upstream, attribution);
  }

  if (crossing.dialect === upstreamDialect) {
    return sameDialectStreamedAnswer(crossing, upstream, attribution);
  }

  const body = upstream.body;

  if (body === null) {
    return passedAlong(upstream, attribution);
  }

  const crossed = translatedStreamBody(upstreamDialect, crossing, body);

  if (crossed === null) {
    return passedAlong(upstream, attribution);
  }

  return sseAnswer(crossed, upstream.status, attribution);
}

function sameDialectStreamedAnswer(
  crossing: Crossing,
  upstream: Response,
  attribution: Record<string, string>,
): Response {
  if (upstream.body === null) return passedAlong(upstream, attribution);

  const body = sameDialectStreamBody(crossing, upstream.body);

  if (body === upstream.body) return passedAlong(upstream, attribution);

  return new Response(body, {
    status: upstream.status,
    headers: upstreamHeaders(upstream, attribution),
  });
}

function needsCompletedResponses(upstreamDialect: ProviderDialect, crossing: Crossing): boolean {
  return upstreamDialect === 'responses' && !wantsStream(crossing.raw);
}

function textAnswer(
  text: string,
  upstream: Response,
  attribution: Record<string, string>,
): Response {
  return new Response(text, {
    status: upstream.status,
    headers: upstreamHeaders(upstream, attribution),
  });
}

async function translatedAnswer(
  crossing: Crossing,
  upstream: Response,
  attribution: Record<string, string>,
  upstreamDialect: ProviderDialect,
): Promise<Response> {
  const text = await upstream.text();
  const answer = parsedJson(text);

  if (!isJsonObject(answer)) {
    return textAnswer(text, upstream, attribution);
  }

  if (crossing.dialect === upstreamDialect) {
    return sameDialectJsonAnswer(crossing, answer, text, upstream, attribution);
  }

  return translatedJsonAnswer(crossing, upstreamDialect, answer, text, upstream, attribution);
}

function sameDialectJsonAnswer(
  crossing: Crossing,
  answer: JsonObject,
  text: string,
  upstream: Response,
  attribution: Record<string, string>,
): Response {
  return crossing.dialect === 'anthropic' && isAnthropicAnswer(answer)
    ? jsonResponse(answeredBy(answer, crossing.providerModel), upstream.status, attribution)
    : textAnswer(text, upstream, attribution);
}

function translatedJsonAnswer(
  crossing: Crossing,
  upstreamDialect: ProviderDialect,
  answer: JsonObject,
  text: string,
  upstream: Response,
  attribution: Record<string, string>,
): Response {
  const crossed = translatedResponse(upstreamDialect, crossing, answer);

  if (crossed === null || 'outcome' in crossed) {
    return textAnswer(text, upstream, attribution);
  }

  if ('refusal' in crossed) {
    return refusalResponse(crossing.dialect, crossed.refusal);
  }

  const restored = restoredResponsesAnswer(crossing, crossed.value);
  const value = attributedAnswer(crossing, restored);

  return jsonResponse(value, upstream.status, attribution);
}

async function completedResponsesAnswer(
  crossing: Crossing,
  upstream: Response,
  attribution: Record<string, string>,
): Promise<Response> {
  if (upstream.body === null) {
    return unreachableTargetAnswer(crossing);
  }

  let completed: (JsonObject & ResponsesResponse) | null = null;

  for await (const event of jsonEventsFrom(upstream.body)) {
    const failure = await codexTerminalErrorAnswer(event, crossing.dialect, attribution);

    if (failure !== null) return failure;

    const response = terminalResponseIn(event);

    if (response !== null) {
      completed = response;
    }
  }

  return completedResponsesResult(crossing, upstream, attribution, completed);
}

function completedResponsesResult(
  crossing: Crossing,
  upstream: Response,
  attribution: Record<string, string>,
  completed: (JsonObject & ResponsesResponse) | null,
): Response {
  return completed === null
    ? unreachableTargetAnswer(crossing)
    : translatedJsonAnswer(
        crossing,
        'responses',
        completed,
        JSON.stringify(completed),
        upstream,
        attribution,
      );
}
