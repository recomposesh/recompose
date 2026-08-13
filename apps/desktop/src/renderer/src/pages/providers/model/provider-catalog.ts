import type {
  CredentialedAccount,
  CredentialedAccountKind,
  LocalRuntimeId,
  SubscriptionProviderId,
} from '@recompose/contracts';

import {
  documentedKeyOpeningOf,
  localRuntimeIdSchema,
  subscriptionProviderIdSchema,
  vendorEndpointOf,
} from '@recompose/contracts';

import type { BrandMarkName } from '../../../shared/ui';
import type { CatalogEntry, CatalogOffer, ConnectionWay } from './catalog-entries';

import { catalogEntries } from './catalog-entries';

export type { CatalogEntry, CatalogOffer, ConnectionWay, OfferTakes } from './catalog-entries';
export { catalogEntries } from './catalog-entries';

function entryFor(id: string): CatalogEntry | undefined {
  return catalogEntries.find((entry) => entry.id === id);
}

/**
 * The name a provider goes by on screen.
 *
 * @summary Reach for it where a provider is read without a catalog row beside it, so a stored
 * account and the catalog it came from never disagree about what the provider is called. A
 * provider the catalog never named reads as the identity it was stored under, so a row that
 * predates the catalog still says whose credential it holds rather than standing nameless.
 */
export function providerName(id: string): string {
  return entryFor(id)?.name ?? id;
}

/** The copy an entry's row reads as under one way, or nothing when the way is not offered. */
export function offerFor(entry: CatalogEntry, way: ConnectionWay): CatalogOffer | undefined {
  return entry.offers.find((offer) => offer.way === way);
}

/**
 * The offer that hands over a secret, or nothing where the entry never asks for one.
 *
 * @summary Signing in and serving this machine both reach a provider without a stored secret, so
 * the ways that do are named here once instead of being guessed at by each caller. A coding plan
 * hands over a secret while standing in the subscriptions column, so the question asked is what
 * the offer takes rather than which column it stands in.
 */
function keyOfferIn(entry: CatalogEntry): CatalogOffer | undefined {
  return entry.offers.find((offer) => offer.takes === 'key' || offer.takes === 'address');
}

/**
 * The plan product a stored subscription reads as, which is what its catalog card read as.
 *
 * @summary A person connected "Claude", so the row that lists the account keeps that word
 * rather than trading it for the vendor behind it.
 */
export function subscriptionTitleFor(id: string): string {
  if (id === 'antigravity') {
    return 'Gemini';
  }

  const entry = entryFor(id);
  const title = entry === undefined ? undefined : offerFor(entry, 'subscription')?.title;

  return title ?? providerName(id);
}

/** The vendor mark used for a subscription product whose transport has its own provider id. */
export function subscriptionMarkFor(id: SubscriptionProviderId): BrandMarkName {
  return id === 'antigravity' ? 'gemini' : id;
}

/**
 * The endpoint product a stored key reads as, which is what its catalog entry was picked as.
 *
 * @summary A person picked "Anthropic API", so the row that lists the key keeps that word. A key
 * stored under a provider the catalog never offered keeps the provider it was stored under, so a
 * row that predates the catalog still says whose key it holds rather than standing nameless.
 */
export function keyTitleFor(provider: string): string {
  const entry = entryFor(provider);
  const offer = entry === undefined ? undefined : keyOfferIn(entry);

  return offer?.title ?? provider;
}

/**
 * The shape a provider's keys are handed out in, or nothing where no shape is documented.
 *
 * @summary Reach for it where an empty key field wants a hint. The hint echoes the one documented
 * prefix family per vendor, so a person pasting recognizes at a glance which key belongs here. A
 * vendor publishing no shape leaves the field unhinted rather than teaching one nobody promised.
 */
export function keyShapeHintFor(provider: string): string | undefined {
  const opening = documentedKeyOpeningOf(provider);

  return opening === undefined ? undefined : `${opening}…`;
}

/**
 * The host a provider's key is spent against, or nothing where its one key reaches many.
 *
 * @summary Reach for it where a person is about to hand over a key, so the surface says which
 * host will hold it before it is stored. An aggregator reaches many hosts through one key, so it
 * names none of them rather than naming the wrong one, and an address a person has yet to type
 * names none either, because nothing knows it yet.
 */
function namesItsHost(offer: CatalogOffer | undefined): boolean {
  return offer !== undefined && offer.way !== 'aggregator' && offer.takes !== 'address';
}

export function keyHostFor(provider: string): string | undefined {
  const entry = entryFor(provider);

  if (!namesItsHost(entry === undefined ? undefined : keyOfferIn(entry))) {
    return undefined;
  }

  const origin = vendorEndpointOf(provider)?.origin;

  return origin === undefined ? undefined : new URL(origin).host;
}

/** The mark a stored provider is drawn with, or nothing where the catalog draws a glyph. */
export function markFor(provider: string): BrandMarkName | undefined {
  const lead = entryFor(provider)?.lead;

  return lead !== undefined && 'mark' in lead ? lead.mark : undefined;
}

/**
 * Whether a check can answer anything about a stored key.
 *
 * @summary A check asks a vendor whether the key authenticates, so it needs an endpoint to ask
 * and a header to ask with. The directory names both, so a key under a vendor it names offers a
 * check, and a key under an address a person typed offers none, because nobody documented what
 * lives there. An aggregator offers none whatever the directory holds, because its models list
 * describes a catalog the vendor serves to anyone.
 */
export function checkableKey(account: CredentialedAccount): boolean {
  return (
    account.kind === 'api-key' &&
    account.endpoint === undefined &&
    vendorEndpointOf(account.provider) !== undefined
  );
}

/** The entries that offer one way, in catalog order, which is what a kind-locked list holds. */
export function offeredUnder(
  entries: readonly CatalogEntry[],
  way: ConnectionWay,
): readonly CatalogEntry[] {
  return entries.filter((entry) => offerFor(entry, way) !== undefined);
}

/**
 * The provider identity an entry would sign in under, or nothing when it never signs in.
 *
 * @summary An entry whose offer takes a sign-in is a claim that its identity is one the
 * subscription contract knows, so the claim is checked here rather than trusted downstream.
 */
export function signInProviderOf(entry: CatalogEntry): SubscriptionProviderId | undefined {
  const signsIn = entry.offers.some((offer) => offer.takes === 'sign-in');

  return signsIn ? subscriptionProviderIdSchema.parse(entry.id) : undefined;
}

/**
 * The runtime an entry would be detected and stored as, or nothing when it reaches off the machine.
 *
 * @summary An entry whose offer takes a runtime is a claim that its identity is one the
 * local-runtimes contract knows an address for, so the claim is checked here rather than trusted.
 */
export function localRuntimeOf(entry: CatalogEntry): LocalRuntimeId | undefined {
  const detected = entry.offers.some((offer) => offer.takes === 'runtime');

  return detected ? localRuntimeIdSchema.parse(entry.id) : undefined;
}

/**
 * The kind an entry's key would be held under, or nothing when it hands over no secret.
 *
 * @summary An aggregator's one key reaches many models, and every other secret reaches one
 * vendor, so the column the row stood in decides the kind. A coding plan stands among the
 * subscriptions and holds a key, which is why the answer follows the offer rather than the column
 * alone.
 */
export function keyKindOf(entry: CatalogEntry): CredentialedAccountKind | undefined {
  const offer = keyOfferIn(entry);

  if (offer === undefined) {
    return undefined;
  }

  return offer.way === 'aggregator' ? 'aggregator' : 'api-key';
}
