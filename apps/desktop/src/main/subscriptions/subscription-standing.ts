import type { SubscriptionProviderId } from '@recompose/contracts';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { claudeOauthIn, credentialFactsFor, documentIn } from './credential-records';

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

async function readFromHome(provider: SubscriptionProviderId, home: string): Promise<Reading> {
  const credentialFile = provider === 'openai' ? 'auth.json' : '.credentials.json';
  const [credential, identity] = await Promise.all([
    blobIn(home, credentialFile),
    blobIn(home, '.claude.json'),
  ]);
  const facts = credentialFactsFor(provider, documentIn(credential), documentIn(identity));

  return {
    evidence: facts.holdsAccount || facts.holdsKey,
    signedInAs: facts.signedInAs,
    plan: facts.plan,
  };
}

async function keptOutsideTheHome(ask: OutsideCredential): Promise<boolean> {
  if (ask === null) {
    return false;
  }

  const blob = await ask().catch(() => null);

  return blob !== null && claudeOauthIn(documentIn(blob)) !== null;
}

function onlyWhatTheRecordsSay(reading: Reading): Omit<SubscriptionObservation, 'standing'> {
  return {
    ...(reading.signedInAs === undefined ? {} : { signedInAs: reading.signedInAs }),
    ...(reading.plan === undefined ? {} : { plan: reading.plan }),
  };
}

export async function observeSubscription(
  request: StandingRequest,
): Promise<SubscriptionObservation> {
  const reading = await readFromHome(request.provider, request.home);
  const held = reading.evidence || (await keptOutsideTheHome(request.outsideCredential));

  return { standing: held ? 'connected' : 'lapsed', ...onlyWhatTheRecordsSay(reading) };
}
