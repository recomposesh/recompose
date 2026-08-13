import type { MachineCredentialReading, SubscriptionProviderId } from '@recompose/contracts';

import type { CredentialFacts } from './credential-records';

import { KeychainDenied } from './credential-custody';
import { credentialFactsFor, documentIn } from './credential-records';

export type MachineStore = {
  readBlob: () => Promise<string | null>;
  readIdentity: () => Promise<string | null>;
};

export type MachineMaterial = {
  blob: string;
  signedInAs?: string;
  plan?: string;
};

async function factsFrom(provider: SubscriptionProviderId, store: MachineStore) {
  const [blob, identity] = await Promise.all([store.readBlob(), store.readIdentity()]);

  return blob === null
    ? null
    : { blob, facts: credentialFactsFor(provider, documentIn(blob), documentIn(identity)) };
}

function named(facts: { signedInAs: string | undefined; plan: string | undefined }) {
  return {
    ...(facts.signedInAs === undefined ? {} : { signedInAs: facts.signedInAs }),
    ...(facts.plan === undefined ? {} : { plan: facts.plan }),
  };
}

function readingFrom(
  held: { blob: string; facts: CredentialFacts } | null,
  now: () => number,
): MachineCredentialReading {
  if (held === null) {
    return { holds: 'nothing' };
  }

  if (!held.facts.holdsAccount) {
    return { holds: 'no-account-credential' };
  }

  const lapsed = held.facts.expiresAt !== undefined && held.facts.expiresAt <= now();

  return { holds: 'account', standing: lapsed ? 'lapsed' : 'connected', ...named(held.facts) };
}

/**
 * @summary Reports what the provider's own tool left on this machine, carrying no credential
 * material, because this answer crosses to the screen before a person has acted on it. A store
 * that refused to open reads apart from an empty machine, so a denial never reads as nothing.
 */
export async function readMachineCredential(
  provider: SubscriptionProviderId,
  store: MachineStore,
  now: () => number = Date.now,
): Promise<MachineCredentialReading> {
  return factsFrom(provider, store).then(
    (held) => readingFrom(held, now),
    (cause: unknown) => {
      if (cause instanceof KeychainDenied) {
        return { holds: 'store-refused' } as const;
      }

      throw cause;
    },
  );
}

/**
 * @summary The credential itself, read only under a person's act to adopt. It never crosses to the
 * screen. A refusal travels out rather than reading as nothing to adopt, because the two mean
 * different things to the person.
 */
export async function machineCredentialMaterial(
  provider: SubscriptionProviderId,
  store: MachineStore,
): Promise<MachineMaterial | null> {
  const held = await factsFrom(provider, store);

  return held === null || !held.facts.holdsAccount
    ? null
    : { blob: held.blob, ...named(held.facts) };
}
