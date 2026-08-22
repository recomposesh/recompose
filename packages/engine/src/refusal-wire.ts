import type { GeminiRefusal } from './gemini-refusal';

export type Dialect = 'anthropic' | 'chat-completions' | 'gemini' | 'interactions' | 'responses';

export type AnthropicRefusal = {
  type: 'error';
  error: {
    type:
      | 'not_found_error'
      | 'permission_error'
      | 'authentication_error'
      | 'invalid_request_error'
      | 'api_error';
    message: string;
  };
};

export type OpenAiCode =
  | 'model_not_found'
  | 'unmappable_stop_reason'
  | 'unrepairable_tool_call'
  | 'unsupported_field'
  | 'empty_conversation'
  | 'tool_id_collision'
  | 'missing_target'
  | 'missing_credential'
  | 'unstreamable_answer'
  | 'empty_router'
  | 'exhausted_router'
  | 'chained_turn'
  | 'unjudged_request'
  | 'invalid_json';

export type RouterAttempt = { child: string; why: string };

export type TranslationRefusal =
  | { reason: 'unknown-model'; model: string }
  | { reason: 'unmappable-stop-reason'; stopReason: string }
  | { reason: 'unrepairable-tool-call'; unmatchedId: string }
  | { reason: 'unsupported-field'; field: string }
  | { reason: 'empty-conversation' }
  | { reason: 'tool-id-collision'; sanitizedId: string }
  | { reason: 'missing-target'; displayName: string; model: string }
  | { reason: 'missing-credential'; displayName: string; model: string }
  | { reason: 'unstreamable-answer'; displayName: string; model: string; target: string }
  | { reason: 'empty-router'; displayName: string; model: string; routerName: string }
  | {
      reason: 'exhausted-router';
      displayName: string;
      model: string;
      routerName: string;
      attempts: readonly RouterAttempt[];
      retryAtMs?: number;
    }
  | { reason: 'chained-turn'; displayName: string; model: string; routerName: string }
  | { reason: 'unjudged-request'; displayName: string; model: string; routerName: string }
  | { reason: 'invalid-json'; message: string };

export type RefusalFacts = {
  status: number;
  message: string;
  code: OpenAiCode;
  anthropicType: AnthropicRefusal['error']['type'];
  retryAfterSeconds?: number;
};

export type OpenAiRefusal = {
  error: {
    message: string;
    type: 'invalid_request_error';
    param: null;
    code: OpenAiCode;
  };
};

export type ResponsesRefusal = {
  error: {
    message: string;
    type: 'invalid_request_error';
    code: OpenAiCode;
    param: null;
  };
};

/**
 * One refusal already shaped for the wire, with the wait a caller owes before trying again.
 *
 * @summary The retry time is a fact of the refusal rather than of the dialect a caller speaks, so it
 * rides here and becomes a header once, at the single seam that turns a rendered refusal into a
 * response. Every dialect therefore reports the same wait without any of them knowing how to. The
 * sentence rides beside the body for the same reason the status does: four envelope shapes bury it in
 * four different places, and the log has to read the words the caller was given without learning any
 * of them.
 */
export type RenderedRefusal = {
  status: number;
  message: string;
  retryAfterSeconds?: number;
  body: AnthropicRefusal | OpenAiRefusal | ResponsesRefusal | GeminiRefusal;
};
