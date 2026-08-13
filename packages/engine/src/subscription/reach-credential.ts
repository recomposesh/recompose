import type {
  AccountTransportPolicy,
  SubscriptionProviderId,
  SubscriptionRenewalOwner,
} from '@recompose/contracts';

import type { ParsedSubscriptionCredential } from './credentials';
import type { RefreshFetch } from './refresh';

import { parseSubscriptionCredential } from './credentials';
import { credentialNeedsRefresh, refreshSubscriptionCredential } from './refresh';

type CredentialSpend = {
  provider: SubscriptionProviderId;
  accountId: string;
  credential: string;
  renewal: SubscriptionRenewalOwner;
  transportPolicy?: AccountTransportPolicy | undefined;
};

type CredentialRuntime = {
  refreshFetch: RefreshFetch;
  persist: (
    provider: SubscriptionProviderId,
    accountId: string,
    credential: string,
  ) => Promise<void>;
  now: () => number;
};

/**
 * @summary Both vendors spend the refresh token on every renewal, so an adopted credential the
 * person's own tool also holds must never be renewed here. Reaching this with one is the defect
 * this guard exists to stop, which is why it throws rather than quietly declining.
 */
export async function refreshedAndPersisted(
  spend: CredentialSpend,
  blob: string,
  runtime: CredentialRuntime,
): Promise<{ blob: string; credential: ParsedSubscriptionCredential }> {
  if (spend.renewal === 'owning-tool') {
    throw new Error(
      `the provider's own tool owns renewal for ${spend.accountId}, so the engine must not renew it`,
    );
  }

  const refreshed = await refreshSubscriptionCredential(
    spend.provider,
    blob,
    runtime.refreshFetch,
    runtime.now(),
    spend.transportPolicy,
  );

  await runtime.persist(spend.provider, spend.accountId, refreshed);

  const credential = parseSubscriptionCredential(spend.provider, refreshed);

  if (credential === null) {
    throw new Error('the refreshed subscription credential could not be read');
  }

  return { blob: refreshed, credential };
}

export function shouldRefreshUnauthorized(
  answer: Response,
  credential: ParsedSubscriptionCredential,
  renewal: SubscriptionRenewalOwner,
): boolean {
  return renewal === 'app' && answer.status === 401 && credential.refreshToken !== undefined;
}

export async function readySubscriptionCredential(
  spend: CredentialSpend,
  runtime: CredentialRuntime,
): Promise<{ blob: string; credential: ParsedSubscriptionCredential }> {
  const credential = parseSubscriptionCredential(spend.provider, spend.credential);

  if (credential === null) {
    throw new Error('the subscription credential could not be read');
  }

  const mine = spend.renewal === 'app';

  return mine && credentialNeedsRefresh(credential, runtime.now(), spend.provider)
    ? refreshedAndPersisted(spend, spend.credential, runtime)
    : { blob: spend.credential, credential };
}
