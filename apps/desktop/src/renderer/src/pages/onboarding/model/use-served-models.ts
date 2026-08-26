import type { ListedModel } from '@recompose/contracts';

import { useQueries } from '@tanstack/react-query';

import type { ProviderModelList } from '../../../shared/api';
import type { FoundSource } from './found-source';
import type { ListingStanding, SourceListing } from './source-reading';

import { providerModelsQueryOptions } from '../../../shared/api';

/** One marked source, how far its listing has got, and whatever that listing named. */
type ServedListing = SourceListing & { models: readonly ListedModel[] };

/** What the marked sources serve, and the way to put the question to all of them again. */
export type ServedModels = {
  /** One reading per marked source, in the order the sources stand. */
  served: readonly ServedListing[];
  /** Asks every account again, which is what a person pressing Try again means by it. */
  lookAgain: () => void;
};

type ListingResult = { data: ProviderModelList | undefined; isError: boolean };

/**
 * @summary A look still in flight and a look that answered nothing are two different states, and
 * folding them into one empty list is what left the build waiting on an account that had already
 * refused. Main refusing the request outright counts as the same silence as a provider answering
 * one, because the account is unreadable either way and neither is a person's to tell apart.
 */
function listingStandingOf(listing: ListingResult): ListingStanding {
  if (listing.data === undefined) {
    return listing.isError ? 'unlisted' : 'looking';
  }

  return listing.data.standing === 'listed' ? 'listed' : 'unlisted';
}

function listingOf(source: FoundSource, listing: ListingResult | undefined): ServedListing {
  if (listing === undefined) {
    return { title: source.title, standing: 'looking', models: [] };
  }

  return {
    title: source.title,
    standing: listingStandingOf(listing),
    models: listing.data?.standing === 'listed' ? listing.data.models : [],
  };
}

/**
 * What each marked source serves, in the order the sources stand.
 *
 * @summary One reading for both the diagram and the build, so the model a person was shown is the
 * model that gets bound. The reading carries how far each look has got beside what it named, which
 * is what lets the run tell a source still answering from one that never will.
 */
export function useServedModels(marked: readonly FoundSource[]): ServedModels {
  const listings = useQueries({
    queries: marked.map((source) => providerModelsQueryOptions(source.id)),
  });

  return {
    served: marked.map((source, index) => listingOf(source, listings[index])),
    lookAgain: () => {
      for (const listing of listings) {
        void listing.refetch();
      }
    },
  };
}
