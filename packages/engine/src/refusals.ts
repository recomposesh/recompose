import type { GeminiRefusal } from './gemini-refusal';
import type {
  AnthropicRefusal,
  Dialect,
  OpenAiRefusal,
  RenderedRefusal,
  RouterAttempt,
  TranslationRefusal,
} from './refusal-wire';
import type { UnjudgedCause } from './routing/outcome-classification';

import { geminiRefusal } from './gemini-refusal';
import { bodyInDialect } from './refusal-bodies';
import { factsOf } from './refusal-facts';

export type {
  AnthropicRefusal,
  Dialect,
  OpenAiRefusal,
  RenderedRefusal,
  RouterAttempt,
  TranslationRefusal,
} from './refusal-wire';

function missingModelMessage(displayName: string): string {
  return `The gateway "${displayName}" holds no virtual model.`;
}

export function missingModelInAnthropicDialect(displayName: string): AnthropicRefusal {
  return {
    type: 'error',
    error: { type: 'not_found_error', message: missingModelMessage(displayName) },
  };
}

export function missingModelInOpenAiDialect(displayName: string): OpenAiRefusal {
  return {
    error: {
      message: missingModelMessage(displayName),
      type: 'invalid_request_error',
      param: null,
      code: 'model_not_found',
    },
  };
}

export function nonLoopbackClient(): AnthropicRefusal {
  return {
    type: 'error',
    error: {
      type: 'permission_error',
      message: 'This gateway answers loopback clients only.',
    },
  };
}

export function apiKeyRequired(displayName: string): AnthropicRefusal {
  return {
    type: 'error',
    error: {
      type: 'authentication_error',
      message: `The gateway "${displayName}" requires an API key.`,
    },
  };
}

export function requestCarriesOrigin(): AnthropicRefusal {
  return {
    type: 'error',
    error: {
      type: 'permission_error',
      message:
        'This gateway refuses any request that carries an Origin header, so no web page can reach it.',
    },
  };
}

function unservedPathMessage(displayName: string, path: string): string {
  return `The gateway "${displayName}" serves no path "${path}".`;
}

export function unservedPath(displayName: string, path: string): AnthropicRefusal {
  return {
    type: 'error',
    error: { type: 'not_found_error', message: unservedPathMessage(displayName, path) },
  };
}

/**
 * The same unserved path, in the envelope a Gemini client parses.
 *
 * @summary A caller that reached a Gemini path named its dialect by arriving there, so its refusal is
 * spelled the way Google spells one. A path nobody serves at all names no dialect, which is why only
 * this one route can shape its own.
 */
export function unservedPathInGeminiDialect(displayName: string, path: string): GeminiRefusal {
  return geminiRefusal(404, unservedPathMessage(displayName, path));
}

export function unknownModel(model: string): TranslationRefusal {
  return { reason: 'unknown-model', model };
}

export function unmappableStopReason(stopReason: string): TranslationRefusal {
  return { reason: 'unmappable-stop-reason', stopReason };
}

export function unrepairableToolCall(unmatchedId: string): TranslationRefusal {
  return { reason: 'unrepairable-tool-call', unmatchedId };
}

export function unsupportedField(field: string): TranslationRefusal {
  return { reason: 'unsupported-field', field };
}

export function emptyConversation(): TranslationRefusal {
  return { reason: 'empty-conversation' };
}

export function toolIdCollision(sanitizedId: string): TranslationRefusal {
  return { reason: 'tool-id-collision', sanitizedId };
}

export function missingTarget(displayName: string, model: string): TranslationRefusal {
  return { reason: 'missing-target', displayName, model };
}

export function missingCredential(displayName: string, model: string): TranslationRefusal {
  return { reason: 'missing-credential', displayName, model };
}

export function emptyRouter(
  displayName: string,
  model: string,
  routerName: string,
): TranslationRefusal {
  return { reason: 'empty-router', displayName, model, routerName };
}

export function exhaustedRouter(
  displayName: string,
  model: string,
  routerName: string,
  attempts: readonly RouterAttempt[],
  retryAtMs?: number,
): TranslationRefusal {
  const exhausted = {
    reason: 'exhausted-router',
    displayName,
    model,
    routerName,
    attempts,
  } as const;

  return retryAtMs === undefined ? exhausted : { ...exhausted, retryAtMs };
}

export function chainedTurn(
  displayName: string,
  model: string,
  routerName: string,
): TranslationRefusal {
  return { reason: 'chained-turn', displayName, model, routerName };
}

export function unjudgedRequest(
  displayName: string,
  model: string,
  routerName: string,
  because: UnjudgedCause,
): TranslationRefusal {
  return { reason: 'unjudged-request', displayName, model, routerName, because };
}

export function invalidJson(message: string): TranslationRefusal {
  return { reason: 'invalid-json', message };
}

export function unstreamableAnswer(
  displayName: string,
  model: string,
  target: string,
): TranslationRefusal {
  return { reason: 'unstreamable-answer', displayName, model, target };
}

/**
 * One refusal shaped for the wire: a status, a body the caller's dialect reads, and any wait it owes.
 *
 * @summary A refusal that names a moment has to tell the caller how long from now, so the wait is
 * worked out here rather than left as an instant only the gateway's own clock could read.
 */
export function renderRefusal(dialect: Dialect, refusal: TranslationRefusal): RenderedRefusal {
  const facts = factsOf(refusal);
  const rendered = {
    status: facts.status,
    message: facts.message,
    body: bodyInDialect(dialect, facts),
  };

  return facts.retryAfterSeconds === undefined
    ? rendered
    : { ...rendered, retryAfterSeconds: facts.retryAfterSeconds };
}
