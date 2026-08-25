import { useQueries } from '@tanstack/react-query';

import type { FoundSource } from './found-source';

import { providerModelsQueryOptions } from '../../../shared/api';

/**
 * What each marked source serves, in the order the sources stand.
 *
 * @summary One reading for both the diagram and the build, so the model a person was shown is the
 * model that gets bound. A listing still in flight answers as nothing, which is what holds the
 * build until every target has a model rather than binding an empty id.
 */
export function useServedModels(marked: readonly FoundSource[]): readonly (readonly string[])[] {
  const listings = useQueries({
    queries: marked.map((source) => providerModelsQueryOptions(source.id)),
  });

  return listings.map((listing) =>
    listing.data?.standing === 'listed' ? listing.data.modelIds : [],
  );
}
