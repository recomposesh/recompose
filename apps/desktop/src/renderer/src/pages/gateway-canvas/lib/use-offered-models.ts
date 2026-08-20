import { useQuery } from '@tanstack/react-query';

import { providerModelsQueryOptions, refusalSentence } from '../../../shared/api';
import { modelListReading } from './model-draft';

/**
 * The models one account serves as of this look, and the sentence a look that reached nothing left.
 *
 * @summary An empty account id asks nothing, so a field standing before a person has picked anyone
 * costs no request. Every surface that picks a real model reads through here, because the drawer
 * and the inspector must not disagree about what an account can serve.
 */
export function useOfferedModels(accountId: string) {
  const look = useQuery({
    ...providerModelsQueryOptions(accountId),
    enabled: accountId !== '',
  });
  const reading = modelListReading(look.data);

  return {
    offered: reading.offered,
    refusal: look.error === null ? reading.refusal : refusalSentence(look.error),
  };
}
