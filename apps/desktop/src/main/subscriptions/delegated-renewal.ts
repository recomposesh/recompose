import type { SubscriptionProviderId } from '@recompose/contracts';

import { subscriptionProviders, toolBacked } from '@recompose/contracts';

import type { OneAtATime } from '../storage/one-at-a-time';

import { oneAtATime } from '../storage/one-at-a-time';

export type RenewalRun = {
  present: () => Promise<boolean>;
  /** Re-reads the live store, because the owning tool may have rotated it since the ask. */
  stale: () => Promise<boolean>;
  renew: (binary: string) => Promise<void>;
};

export type DelegatedRenewalOutcome =
  | { verdict: 'renewed' }
  | { verdict: 'tool-missing' }
  | { verdict: 'run-failed'; message: string };

const lanes = new Map<SubscriptionProviderId, OneAtATime>();

function laneFor(provider: SubscriptionProviderId): OneAtATime {
  const standing = lanes.get(provider);

  if (standing !== undefined) {
    return standing;
  }

  const opened = oneAtATime();

  lanes.set(provider, opened);

  return opened;
}

/**
 * Hands a renewal to the tool that owns the credential, one run at a time per provider.
 *
 * @summary Both vendors spend the refresh token on renewal, so the program that wrote a credential
 * is the only one that may rotate it. Every serving turn resolves its grant in this process, so one
 * lane per provider is the whole lock. Two turns arriving together produce one run, because the
 * waiter re-reads the store inside the lane and finds what its predecessor left. A run that cannot
 * happen leaves the credential exactly as it stands.
 */
export async function delegatedRenewal(
  provider: SubscriptionProviderId,
  run: RenewalRun,
): Promise<DelegatedRenewalOutcome> {
  return laneFor(provider)(async () => {
    if (!(await run.stale())) {
      return { verdict: 'renewed' };
    }

    if (!(await run.present())) {
      return { verdict: 'tool-missing' };
    }

    if (!toolBacked(provider)) {
      return { verdict: 'tool-missing' };
    }

    return run
      .renew(subscriptionProviders[provider].toolBinary)
      .then<DelegatedRenewalOutcome>(() => ({ verdict: 'renewed' }))
      .catch((cause: unknown) => ({
        verdict: 'run-failed',
        message: cause instanceof Error ? cause.message : String(cause),
      }));
  });
}
