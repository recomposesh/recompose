import type { AccountKind } from '@recompose/contracts';

import type { CatalogLead } from './catalog-lead';

/**
 * A way an account reaches a provider, which is every kind the registry holds one under.
 *
 * @summary The contract owns the set, so the catalog names it rather than restating it. Reading
 * it from here rather than from the account entity keeps two entities from leaning on each other
 * for a word neither of them coined.
 */
export type ConnectionWay = AccountKind;

/** The kind a provider is held under, offered from here so a catalog reader needs one import. */
export type ProviderKind = AccountKind;

/**
 * What a picked entry's connect step asks a person for.
 *
 * @summary The column an entry stands in and the thing it asks for are two different facts. A
 * coding plan stands among the subscriptions, because that's where a person who bought a plan
 * looks, and asks for the token the plan issued, because no sign-in exists to offer.
 */
export type OfferTakes = 'sign-in' | 'key' | 'runtime' | 'address';

export type CatalogOffer = {
  /** The column the row stands in, which is the kind the surface behind it holds. */
  way: ConnectionWay;
  /** What the connect step asks for once the row is picked. */
  takes: OfferTakes;
  /** What the row reads as under this way, which is the product rather than the vendor. */
  title: string;
  /** One line saying what connecting this way gives. */
  benefit: string;
};

/**
 * What a provider wants before it will report a balance, where its own key is not enough.
 *
 * @summary Only a provider that refuses its inference key on the balance endpoint carries one, so
 * an entry with none is a provider whose ordinary key already reads a balance or one that reports
 * no balance at all. The note says the key never serves a request, because a person handing an app
 * a second key is owed the reason it cannot simply reuse the first.
 */
export type ReaderKeyAsk = { label: string; hint: string; note: string };

export type CatalogEntry = {
  /** The provider the entry stands for, which is the identity a stored row keeps. */
  id: string;
  /** The name the provider goes by on screen. */
  name: string;
  /** The mark or glyph the entry's cards lead with. */
  lead: CatalogLead;
  /** Every way this provider can be connected, in the order they are offered. */
  offers: readonly CatalogOffer[];
  /**
   * The vendor's own page where the key this entry takes is issued.
   *
   * @summary Only an entry whose vendor publishes such a page carries one, because a link the app
   * guessed at is worse than none: a person who lands on the wrong page concludes the key is
   * somewhere else. The app never restates the steps behind it either, since the vendor moves them.
   */
  keyPage?: { label: string; href: string };
  /** The read-only key this provider needs before a balance card can show anything. */
  readerKey?: ReaderKeyAsk;
};
