import { useQueryClient } from '@tanstack/react-query';

import { useRemoveGateway } from '../../../../shared/api';
import { forgottenEverywhere } from './removal-flow';

/**
 * The one act that deletes this gateway, leaving nothing of it behind on this side.
 *
 * @summary The caller hears the gateway is gone only after this side has forgotten it, so the
 * leave lands on a canvas already clean. A refused delete answers through the standings.
 */
export function useGatewayRemoval(
  slug: string,
  refuse: (failure: unknown) => void,
  onGatewayRemoved: () => void,
): () => void {
  const queryClient = useQueryClient();
  const removeGateway = useRemoveGateway();

  return () => {
    removeGateway.mutate(
      { slug },
      {
        onSuccess: () => {
          forgottenEverywhere(queryClient, slug);
          onGatewayRemoved();
        },
        onError: refuse,
      },
    );
  };
}
