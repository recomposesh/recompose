import type { Account, SubscriptionProviderId } from '@recompose/contracts';

import { vendorEndpointOf } from '@recompose/contracts';

const subscriptionOrigins: Record<SubscriptionProviderId, string> = {
  anthropic: 'https://api.anthropic.com',
  openai: 'https://chatgpt.com/backend-api/codex',
  antigravity: 'https://daily-cloudcode-pa.googleapis.com',
  kimi: 'https://api.kimi.com/coding',
  copilot: 'https://api.githubcopilot.com',
};

const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * The origin named in the environment to stand in for every vendor, where one names a machine.
 *
 * @summary A scenario driving the whole app has to spend a stored key somewhere it can watch, and
 * the engine child already honors a probe origin on the same terms. Anything naming a host off this
 * machine is refused rather than honored, so a variable a person did not set cannot quietly send
 * their credential somewhere else.
 */
function standInOrigin(): string | undefined {
  const named = process.env['RECOMPOSE_SERVING_ORIGIN'];

  if (named === undefined) {
    return undefined;
  }

  if (URL.canParse(named) && loopbackHosts.has(new URL(named).hostname)) {
    return named;
  }

  console.error('recompose ignored a serving origin, because it does not name a loopback host.');

  return undefined;
}

/**
 * Where a target account is spent, or nothing when recompose serves nothing for its provider.
 *
 * @summary A runtime on this machine is spent against the address its row was stored with, so a
 * person who moved it off the documented port is served where it actually listens. A row a person
 * addressed themselves is spent at the address they gave, which outranks everything else because
 * nothing else knows about it. Every other key is spent at the endpoint the provider directory
 * names, so one table describes the vendor for both processes. A provider nothing names stays
 * unserved whatever the environment says, because the stand-in redirects a vendor rather than
 * inventing one.
 */
export function providerOriginOf(account: Account): string | undefined {
  if (account.kind === 'local') {
    return account.address;
  }

  if (account.kind !== 'subscription' && account.endpoint !== undefined) {
    return account.endpoint.origin;
  }

  return subscriptionOriginOf(account) ?? keyedOriginOf(account.provider);
}

function subscriptionOriginOf(account: Account): string | undefined {
  if (account.kind !== 'subscription') {
    return undefined;
  }

  return standInOrigin() ?? subscriptionOrigins[account.provider];
}

function keyedOriginOf(provider: string): string | undefined {
  const served = vendorEndpointOf(provider)?.origin;

  if (served !== undefined) return standInOrigin() ?? served;

  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(provider) ? `plugin://${provider}` : undefined;
}
