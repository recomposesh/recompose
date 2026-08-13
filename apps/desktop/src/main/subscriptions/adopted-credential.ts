import type { SubscriptionProviderId } from '@recompose/contracts';

import type { RenewalRun } from './delegated-renewal';
import type { MachineReach } from './machine-store';

import { credentialFactsFor, documentIn } from './credential-records';
import { delegatedRenewal } from './delegated-renewal';
import { machineCredentialMaterial } from './machine-credential';
import { machineStoreFor } from './machine-store';

export type AdoptedCredentialDeps = {
  reach: MachineReach;
  toolPresent: (provider: SubscriptionProviderId) => Promise<boolean>;
  runTool: (binary: string, args: readonly string[]) => Promise<void>;
  now: () => number;
};

const RENEWAL_MARGIN_MS = 5 * 60 * 1000;

async function blobFor(
  provider: SubscriptionProviderId,
  deps: AdoptedCredentialDeps,
): Promise<string | null> {
  const held = await machineCredentialMaterial(provider, machineStoreFor(provider, deps.reach));

  return held?.blob ?? null;
}

function nearsExpiry(
  provider: SubscriptionProviderId,
  blob: string | null,
  now: () => number,
): boolean {
  if (blob === null) {
    return false;
  }

  const { expiresAt } = credentialFactsFor(provider, documentIn(blob), null);

  return expiresAt !== undefined && expiresAt <= now() + RENEWAL_MARGIN_MS;
}

/**
 * Reads what a provider's own tool holds right now, renewing through that tool near expiry.
 *
 * @summary Both vendors spend the refresh token on renewal, so the app keeps no copy of an adopted
 * credential and never rotates one. Every serving turn reads the live store, so a rotation the
 * owning tool performed between turns is simply the next read's answer. A renewal that cannot run
 * leaves the credential exactly as it stands and serves it, letting the provider be the one to
 * refuse rather than the app guessing on its behalf.
 */
export function adoptedCredentialReader(
  deps: AdoptedCredentialDeps,
): (provider: SubscriptionProviderId) => Promise<string | null> {
  return async (provider) => {
    const standing = await blobFor(provider, deps);

    if (!nearsExpiry(provider, standing, deps.now)) {
      return standing;
    }

    const run: RenewalRun = {
      present: async () => deps.toolPresent(provider),
      stale: async () => nearsExpiry(provider, await blobFor(provider, deps), deps.now),
      renew: deps.runTool,
    };

    const outcome = await delegatedRenewal(provider, run);

    return outcome.verdict === 'renewed' ? blobFor(provider, deps) : standing;
  };
}
