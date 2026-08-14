import type { RefusalFacts, TranslationRefusal } from './refusal-wire';
import type { RouterRefusal } from './router-refusal-facts';

import { isRouterFault, routerFaultFacts } from './router-refusal-facts';

type ClientErrorRefusal = Extract<
  TranslationRefusal,
  { reason: 'unsupported-field' | 'empty-conversation' | 'tool-id-collision' | 'invalid-json' }
>;

function clientErrorFacts(refusal: ClientErrorRefusal): RefusalFacts {
  switch (refusal.reason) {
    case 'unsupported-field':
      return {
        status: 400,
        message: `This dialect cannot carry the field "${refusal.field}".`,
        code: 'unsupported_field',
        anthropicType: 'invalid_request_error',
      };
    case 'empty-conversation':
      return {
        status: 400,
        message: 'The request carries no message to translate.',
        code: 'empty_conversation',
        anthropicType: 'invalid_request_error',
      };
    case 'tool-id-collision':
      return {
        status: 400,
        message: `Two tool calls share the sanitized id "${refusal.sanitizedId}", so their pairing is ambiguous.`,
        code: 'tool_id_collision',
        anthropicType: 'invalid_request_error',
      };
    case 'invalid-json':
      return {
        status: 400,
        message: refusal.message,
        code: 'invalid_json',
        anthropicType: 'invalid_request_error',
      };

    default: {
      const unhandled: never = refusal;

      throw new Error(`unhandled client-error refusal: ${JSON.stringify(unhandled)}`);
    }
  }
}

type ConfigFaultRefusal = Extract<
  TranslationRefusal,
  { reason: 'missing-target' | 'missing-credential' | 'unstreamable-answer' }
>;

function configFaultFacts(refusal: ConfigFaultRefusal): RefusalFacts {
  if (refusal.reason === 'missing-target') {
    return {
      status: 502,
      message: `The gateway "${refusal.displayName}" holds no target for the virtual model "${refusal.model}".`,
      code: 'missing_target',
      anthropicType: 'api_error',
    };
  }

  if (refusal.reason === 'unstreamable-answer') {
    return {
      status: 502,
      message: `The gateway "${refusal.displayName}" could not stream the answer that the target "${refusal.target}" returned for the virtual model "${refusal.model}".`,
      code: 'unstreamable_answer',
      anthropicType: 'api_error',
    };
  }

  return {
    status: 502,
    message: `The virtual model "${refusal.model}" in the gateway "${refusal.displayName}" has no account behind it. Reconnect the account it spends, or point it at another.`,
    code: 'missing_credential',
    anthropicType: 'api_error',
  };
}

const configFaultReasons = ['missing-target', 'missing-credential', 'unstreamable-answer'];

function isConfigFault(refusal: TranslationRefusal): refusal is ConfigFaultRefusal {
  return configFaultReasons.includes(refusal.reason);
}

type TranslationFault = Exclude<TranslationRefusal, ConfigFaultRefusal | RouterRefusal>;

function translationFacts(refusal: TranslationFault): RefusalFacts {
  if (refusal.reason === 'unknown-model') {
    return {
      status: 404,
      message: `No model named "${refusal.model}" is defined.`,
      code: 'model_not_found',
      anthropicType: 'not_found_error',
    };
  }

  if (refusal.reason === 'unmappable-stop-reason') {
    return {
      status: 422,
      message: `The stop reason "${refusal.stopReason}" has no counterpart in this dialect.`,
      code: 'unmappable_stop_reason',
      anthropicType: 'invalid_request_error',
    };
  }

  if (refusal.reason === 'unrepairable-tool-call') {
    return {
      status: 422,
      message: `The tool call "${refusal.unmatchedId}" has no matching tool result, and no repair is possible.`,
      code: 'unrepairable_tool_call',
      anthropicType: 'invalid_request_error',
    };
  }

  return clientErrorFacts(refusal);
}

/**
 * The status, message, and code one refusal carries, whatever dialect ends up wearing them.
 *
 * @summary Three families sort every refusal the gateway raises: what a router could not do, what a
 * person left unwired, and what the request itself asked for. Sorting them here rather than at the
 * envelope keeps one refusal reading the same in five dialects, which is the whole reason a rendered
 * refusal is built from facts rather than written out per wire.
 */
export function factsOf(refusal: TranslationRefusal): RefusalFacts {
  if (isRouterFault(refusal)) return routerFaultFacts(refusal);

  return isConfigFault(refusal) ? configFaultFacts(refusal) : translationFacts(refusal);
}
