import type { SpendGrant } from '@recompose/contracts';

import type { ProviderDialect, ProxyDialect } from './gateway-wire';

import { credentialedDialect } from './provider/credentialed-target';

/**
 * How a turn bought by a plan reads on the wire.
 *
 * @summary Each plan answers the dialect its own tool speaks, so the dialect follows the plan
 * rather than the caller, with two exceptions. Kimi serves both dialects and follows the caller
 * whether the credential is a plan token or a pasted key, so it answers from the one table that
 * already knows that. Copilot serves three wires and names per model which of them answers, so the
 * completions dialect here is only what a turn falls back to: the catalog read on the way out
 * settles the wire ahead of this, and this stands for the turn whose catalog could not be read.
 */
function subscriptionDialect(provider: string, sourceDialect: ProxyDialect): ProviderDialect {
  if (provider === 'anthropic') return 'anthropic';

  if (provider === 'antigravity') return 'gemini';

  if (provider === 'kimi') return credentialedDialect(provider, sourceDialect);

  return provider === 'copilot' ? 'chat-completions' : 'responses';
}

export function dialectFor(grant: SpendGrant, sourceDialect: ProxyDialect): ProviderDialect {
  if (grant.verdict !== 'resolved') return 'chat-completions';
  if (grant.spend.custody === 'open') return 'chat-completions';

  return grant.spend.custody === 'credentialed'
    ? credentialedDialect(grant.spend.provider, sourceDialect)
    : subscriptionDialect(grant.spend.provider, sourceDialect);
}
