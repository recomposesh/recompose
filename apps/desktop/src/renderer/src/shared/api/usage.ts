import type { UsageReportAsk } from '@recompose/contracts';
import type { QueryClient } from '@tanstack/react-query';

import { queryOptions } from '@tanstack/react-query';

import { unwrapIpcResult } from './ipc-result';

const MINUTE_MS = 60_000;
const FIVE_MINUTES_MS = 300_000;

function reportFreshness(ask: UsageReportAsk): number {
  return ask.range === '30d' ? FIVE_MINUTES_MS : MINUTE_MS;
}

/**
 * One ask of closed usage buckets, priced at day width, polled at the width's own pace.
 *
 * @summary Reports answer closed buckets only, so nothing changes faster than a bucket closes:
 * hour-wide ranges poll every minute, the day-wide range every five. Every ask holds its own key,
 * so a narrower window asking the same range for hours never repaints the folded view.
 */
export function usageReportQueryOptions(ask: UsageReportAsk) {
  const freshness = reportFreshness(ask);

  return queryOptions({
    queryKey: ['usage-report', ask.range, ask.bucketWidth ?? 'default', ask.dayOffsetMinutes ?? 0],
    queryFn: async () => unwrapIpcResult(await window.recompose['usage:report'](ask)),
    staleTime: freshness,
    refetchInterval: freshness,
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

  await queryClient.ensureQueryData(usageReportQueryOptions(ask));
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
