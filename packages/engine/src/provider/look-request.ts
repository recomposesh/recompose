import type { KeyProviderId, LookCustody } from '@recompose/contracts';

import { copilotHeaders } from './copilot-request';

const modelsPath = '/v1/models';

const geminiModelsPath = '/v1beta/models';

const copilotModelsPath = '/models';

const anthropicVersion = '2023-06-01';

/**
 * The headers one first-party vendor reads its own key from.
 *
 * @summary Anthropic answers `x-api-key` beside the version it was written against and turns a
 * bearer token away, so the header is picked per vendor rather than assumed. Every vendor without
 * an arm here reads the OpenAI-compatible bearer the caller falls back to.
 */
export function authHeadersFor(provider: KeyProviderId, key: string): Record<string, string> {
  switch (provider) {
    case 'anthropic':
      return { 'x-api-key': key, 'anthropic-version': anthropicVersion };
    case 'openai':
      return { Authorization: `Bearer ${key}` };
    case 'gemini':
    case 'gemini-interactions':
      return { 'x-goog-api-key': key };

    default: {
      const unknownProvider: never = provider;

      throw new Error(`no look speaks to the provider: ${String(unknownProvider)}`);
    }
  }
}

/**
 * How one look spells the credential it was handed, whatever the vendor.
 *
 * @summary The key check and the model list read the same catalog at the same address, so they
 * spell the credential the same way rather than each keeping its own table of vendors.
 */
function looksLikeCopilot(custody: LookCustody): boolean {
  return custody.custody === 'subscription' && custody.provider === 'copilot';
}

export function lookHeadersFor(custody: LookCustody): Record<string, string> {
  if (custody.custody === 'open') {
    return {};
  }

  if (looksLikeCopilot(custody)) {
    return copilotHeaders(custody.credential);
  }

  return custody.custody === 'provider-key'
    ? authHeadersFor(custody.provider, custody.credential)
    : { Authorization: `Bearer ${custody.credential}` };
}

function looksLikeGemini(custody: LookCustody): boolean {
  return (
    custody.custody === 'provider-key' &&
    (custody.provider === 'gemini' || custody.provider === 'gemini-interactions')
  );
}

/**
 * @summary Copilot's own base carries no version segment, so its catalog stands one segment shorter
 * than every other compatible vendor's, and Gemini publishes its under its own version segment.
 */
/**
 * Whether a vendor's catalog names models that answer no turn a gateway sends.
 *
 * @summary Copilot publishes its embedding and completion models beside the ones that hold a
 * conversation, and refuses a turn sent to any of them. Every other vendor here publishes one
 * catalog of models that all answer the same way.
 */
export function namesModelsThatAnswerNoTurn(custody: LookCustody): boolean {
  return looksLikeCopilot(custody);
}

export function modelsPathFor(custody: LookCustody): string {
  if (looksLikeGemini(custody)) return geminiModelsPath;

  return looksLikeCopilot(custody) ? copilotModelsPath : modelsPath;
}
