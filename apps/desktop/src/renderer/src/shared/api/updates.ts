import type { RecomposeIpcEvents } from '@recompose/contracts';
import type { QueryClient } from '@tanstack/react-query';

import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';

import { unwrapIpcResult } from './ipc-result';

export const updatesQueryOptions = queryOptions({
  queryKey: ['updates'],
  queryFn: async () => unwrapIpcResult(await window.recompose['updates:get']()),
});

/**
 * Points the update push at the query cache and hands back the way to stop listening.
 *
 * @summary Every push carries the whole state, so writing it straight into the cache is what lets
 * a card that mounted after the download read the same answer a live window was told.
 */
export function useRestartForUpdate() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async () => {
      unwrapIpcResult(await window.recompose['updates:restart']());
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: updatesQueryOptions.queryKey });
    },
  });

  return {
    restart: () => {
      mutation.mutate();
    },
    restarting: mutation.isPending,
  };
}

export function bindUpdateStateToCache(
  queryClient: QueryClient,
  subscribe: RecomposeIpcEvents['updates:changed'] = window.recomposeEvents['updates:changed'],
): () => void {
  return subscribe((state) => {
    queryClient.setQueryData(updatesQueryOptions.queryKey, state);
  });
}
