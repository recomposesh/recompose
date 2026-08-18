import type {
  AnthropicRefusal,
  Dialect,
  OpenAiRefusal,
  RefusalFacts,
  RenderedRefusal,
  ResponsesRefusal,
} from './refusal-wire';

import { geminiRefusal } from './gemini-refusal';

function anthropicBody(facts: RefusalFacts): AnthropicRefusal {
  return { type: 'error', error: { type: facts.anthropicType, message: facts.message } };
}

/**
 * The OpenAI envelope, written from the only two facts it reads.
 *
 * @summary It takes the pair rather than the whole refusal so that a caller holding no dialect to
 * choose from, such as a drawing or filming route, cannot be made to invent facts this envelope would
 * ignore anyway.
 */
export function chatCompletionsBody(facts: Pick<RefusalFacts, 'code' | 'message'>): OpenAiRefusal {
  return {
    error: { message: facts.message, type: 'invalid_request_error', param: null, code: facts.code },
  };
}

function responsesBody(facts: RefusalFacts): ResponsesRefusal {
  return {
    error: { message: facts.message, type: 'invalid_request_error', code: facts.code, param: null },
  };
}

function bodyOutsideGemini(
  dialect: Exclude<Dialect, 'gemini'>,
  facts: RefusalFacts,
): RenderedRefusal['body'] {
  switch (dialect) {
    case 'anthropic':
      return anthropicBody(facts);
    case 'chat-completions':
      return chatCompletionsBody(facts);
    case 'responses':
    case 'interactions':
      return responsesBody(facts);
    default:
      throw new Error(`unhandled dialect: ${String(dialect)}`);
  }
}

/**
 * One set of refusal facts written into the envelope the caller's own dialect reads.
 *
 * @summary Nothing here decides anything about the refusal; it only spells one already-settled set of
 * facts five ways, which is what keeps a status or a message from drifting between dialects.
 */
export function bodyInDialect(dialect: Dialect, facts: RefusalFacts): RenderedRefusal['body'] {
  return dialect === 'gemini'
    ? geminiRefusal(facts.status, facts.message)
    : bodyOutsideGemini(dialect, facts);
}
