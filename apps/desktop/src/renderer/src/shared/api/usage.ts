import type { UsageReportAsk } from '@recompose/contracts';
import type { QueryClient } from '@tanstack/react-query';

import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';

import { unwrapIpcResult } from './ipc-result';

const MINUTE_MS = 60_000;
const WATCHED_POLL_MS = 5_000;

/**
 * One ask of usage buckets, priced at day width, polled while a surface is reading it.
 *
 * @summary A report carries the hour still filling, so a request landing now changes the answer
 * now. This pace is the one a card's day summary wants: the reading beside it moves once a
 * minute, and a whole range of buckets crosses the channel each time it does. The interval only
 * runs while a mounted surface reads the query. Every ask holds its own key, so a narrower window
 * asking the same range for hours never repaints the folded view.
 */
export function usageReportQueryOptions(ask: UsageReportAsk) {
  return queryOptions({
    queryKey: ['usage-report', ask.range, ask.bucketWidth ?? 'default', ask.dayOffsetMinutes ?? 0],
    queryFn: async () => unwrapIpcResult(await window.recompose['usage:report'](ask)),
    staleTime: MINUTE_MS,
    refetchInterval: MINUTE_MS,
  });
}

/**
 * The same ask, at the pace of someone watching the explorer rather than reading a card.
 *
 * @summary A person standing at the explorer sends a request and looks straight back, so the
 * window they are watching polls every five seconds. Only that surface pays for the pace: the
 * key is the summary's own, so the two share one cached read rather than opening two.
 */
export function watchedUsageReportQueryOptions(ask: UsageReportAsk) {
  return queryOptions({
    ...usageReportQueryOptions(ask),
    staleTime: WATCHED_POLL_MS,
    refetchInterval: WATCHED_POLL_MS,
  });
}

/**
 * The report the usage route's loader warms, or nothing for the live-plane range.
 *
 * @summary The `1h` range folds the renderer's own row cache and never reads the ledger, so the
 * loader has nothing to warm for it.
 */
export async function warmedUsageReport(
  queryClient: QueryClient,
  ask: UsageReportAsk | undefined,
): Promise<void> {
  if (ask === undefined) {
    return;
  }

  await queryClient.ensureQueryData(watchedUsageReportQueryOptions(ask));
}

/** The standing quota windows per subscription account, moved along by the open hour. */
export const quotaWindowsQueryOptions = queryOptions({
  queryKey: ['usage-quota-windows'],
  queryFn: async () => unwrapIpcResult(await window.recompose['usage:quota-windows']()),
  staleTime: MINUTE_MS,
  refetchInterval: MINUTE_MS,
});

/** The last good credits reading per aggregator account, kept as long as the desk keeps its own. */
export const balancesQueryOptions = queryOptions({
  queryKey: ['usage-balances'],
  queryFn: async () =>
    unwrapIpcResult(await window.recompose['usage:balances']({ refresh: false })),
  staleTime: MINUTE_MS,
});

/** Asks upstream for a fresh credits read and lands it where the card already reads. */
export async function refreshedBalances(queryClient: QueryClient): Promise<void> {
  const fresh = unwrapIpcResult(await window.recompose['usage:balances']({ refresh: true }));

  queryClient.setQueryData(balancesQueryOptions.queryKey, fresh);
}

/**
 * The credits card's own refresh, as a request that can be pending and can be refused.
 *
 * @summary An upstream that answered but could not reach the vendor rides back inside the payload
 * as a per-account failure, so only a refusal from the app itself lands here. It stays a mutation
 * rather than an invalidation because a re-read of the standing query would ask without the refresh
 * flag and be answered from the minute the desk already holds.
 */
export function useRefreshBalances() {
  const queryClient = useQueryClient();

  return useMutation({ mutationFn: async () => refreshedBalances(queryClient) });
}
