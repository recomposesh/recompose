import type { SubscriptionProviderId } from '@recompose/contracts';

import { subscriptionPlanNames } from '@recompose/contracts';

import type { Workshop } from '../ipc/subscriptions-workshop';
import type { CredentialCustody } from './credential-custody';
import type { SubscriptionObservation } from './subscription-standing';

import { custodyOver } from './credential-custody';
import { claudeOauthIn, documentIn, spokenAt } from './credential-records';

/**
 * What one signed-in account answers to from then on.
 *
 * @summary An account names itself by the address it signed in as, the way an adopted row already
 * does. Claude Code leaves no address on this machine when it is pointed at a config home of ours,
 * so the address is asked of the far end with the credential it left, which is the same place
 * CLIProxyAPI reads it from. Only an account nobody could name falls back to its plan.
 */
export async function labelFor(
  shop: Workshop,
  provider: SubscriptionProviderId,
  observed: SubscriptionObservation,
  home: string,
): Promise<string> {
  if (observed.signedInAs !== undefined) {
    return observed.signedInAs;
  }

  const custody = custodyOver(shop.ctx.custody, provider);
  const asked = custody === null ? undefined : await addressBehind(shop, custody, home);

  return asked ?? subscriptionPlanNames[provider];
}

async function addressBehind(
  shop: Workshop,
  custody: CredentialCustody,
  home: string,
): Promise<string | undefined> {
  const accessToken = spokenAt(
    claudeOauthIn(documentIn(await custody.readForHome(home))),
    'accessToken',
  );

  return accessToken === undefined ? undefined : shop.ctx.claudeAddress(accessToken);
}
