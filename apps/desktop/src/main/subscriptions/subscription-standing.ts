import type { SubscriptionProviderId } from '@recompose/contracts';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { credentialInHome } from './credential-home-file';
import { credentialFactsFor, documentIn, recordAt } from './credential-records';

export type SubscriptionObservation = {
  standing: 'connected' | 'lapsed';
  signedInAs?: string;
  plan?: string;
};

export type OutsideCredential = (() => Promise<string | null>) | null;

export type StandingRequest = {
  provider: SubscriptionProviderId;
  home: string;
  outsideCredential: OutsideCredential;
};

type Reading = {
  evidence: boolean;
  signedInAs: string | undefined;
  plan: string | undefined;
};

async function blobIn(home: string, file: string): Promise<string | null> {
  return readFile(join(home, file), 'utf8').then(
    (found) => found,
    () => null,
  );
}

function readingOf(
  provider: SubscriptionProviderId,
  credential: string | null,
  identity: string | null,
): Reading {
  const facts = credentialFactsFor(provider, credential, identity);

  return {
    evidence: facts.holdsAccount || facts.holdsKey,
    signedInAs: facts.signedInAs,
    plan: facts.plan,
  };
}

async function blobsIn(
  provider: SubscriptionProviderId,
  home: string,
): Promise<{ credential: string | null; identity: string | null }> {
  const [credential, nested, beside] = await Promise.all([
    credentialInHome(provider, home),
    blobIn(join(home, '.claude'), '.claude.json'),
    blobIn(home, '.claude.json'),
  ]);

  return { credential, identity: identityHolding(nested) ?? beside };
}

/**
 * @summary Claude Code writes its config to either place, so the one holding an account outranks
 * the one that only holds settings. CC Switch resolves the same pair the same way, in `config.rs`.
 */
function identityHolding(nested: string | null): string | null {
  const account = nested === null ? null : recordAt(documentIn(nested), 'oauthAccount');

  return account === null ? null : nested;
}

async function keptOutsideTheHome(ask: OutsideCredential): Promise<string | null> {
  if (ask === null) {
    return null;
  }

  return ask().catch(() => null);
}

function onlyWhatTheRecordsSay(reading: Reading): Omit<SubscriptionObservation, 'standing'> {
  return {
    ...(reading.signedInAs === undefined ? {} : { signedInAs: reading.signedInAs }),
    ...(reading.plan === undefined ? {} : { plan: reading.plan }),
  };
}

/**
 * How one account stands, and whatever its own records say about who holds it.
 *
 * @summary The credential is read from the config home first and from custody second, because a
 * tool that wrote a file is the plainest evidence and custody is where this app parked what a tool
 * wrote to the login keychain instead. Both are folded through the same facts, so the plan a
 * keychain credential names reaches the screen exactly as a file's would: reading custody only for
 * a yes or a no is what left a signed-in account with no plan beside its name.
 */
export async function observeSubscription(
  request: StandingRequest,
): Promise<SubscriptionObservation> {
  const { credential, identity } = await blobsIn(request.provider, request.home);
  const inHome = readingOf(request.provider, credential, identity);

  if (inHome.evidence) {
    return { standing: 'connected', ...onlyWhatTheRecordsSay(inHome) };
  }

  const outside = readingOf(
    request.provider,
    await keptOutsideTheHome(request.outsideCredential),
    identity,
  );

  return {
    standing: outside.evidence ? 'connected' : 'lapsed',
    ...onlyWhatTheRecordsSay(outside),
  };
}
