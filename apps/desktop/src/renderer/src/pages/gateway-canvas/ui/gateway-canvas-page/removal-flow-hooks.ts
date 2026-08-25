import { useQueryClient } from '@tanstack/react-query';

import { useRemoveGateway } from '../../../../shared/api';
import { forgottenEverywhere } from './removal-flow';

/**
 * The one act that deletes this gateway, leaving nothing of it behind on this side.
 *
 * @summary The caller hears the gateway is gone only after this side has forgotten it, so the
 * leave lands on a canvas already clean. A refused delete answers through the standings.
 */
/**
 * Deletes any stored gateway by slug, forgetting everything this side held about it.
 *
 * @summary The canvas deletes the gateway it stands on; a sidebar row deletes the one it names,
 * which is rarely the one standing. Both forget the same arrangement, draft and cached readings,
 * so the forgetting lives here once rather than beside each caller. The refusal travels to the
 * caller rather than being answered here, because the two report it in different places.
 */
export function useGatewayForgetting(): (slug: string) => Promise<void> {
  const queryClient = useQueryClient();
  const removeGateway = useRemoveGateway();

  return async (slug) => {
    await removeGateway.mutateAsync({ slug });
    forgottenEverywhere(queryClient, slug);
  };
}

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
