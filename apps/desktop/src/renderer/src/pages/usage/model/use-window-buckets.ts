import type { LogRow, UsageBucket, UsageReport, UsageReportAsk } from '@recompose/contracts';

import { useQueries, useQuery } from '@tanstack/react-query';

import type { UsageSearch } from '../lib/usage-search';
import type { UsageWindow } from '../lib/usage-window';

import {
  engineLogsQueryOptions,
  gatewaysQueryOptions,
  usageReportQueryOptions,
} from '../../../shared/api';
import { useDisplayTick } from '../../../shared/lib';
import { liveWindowFold } from '../lib/live-window';
import { previousWindowFor, reportAskFor, windowFor } from '../lib/usage-window';

const LIVE_TICK_MS = 10_000;

export type WindowBuckets = {
  /** The instant every reading on the screen stands against. */
  now: number;
  /** What this view asks main for, absent where it folds the renderer's own rows. */
  ask: UsageReportAsk | undefined;
  /** The report main answered, absent while it is still reading or refused. */
  report: UsageReport | undefined;
  /** Why a read refused, absent while it stands. */
  failure: Error | null;
  /** The buckets inside the standing window. */
  buckets: readonly UsageBucket[];
  /** The buckets inside the window standing before it. */
  previous: readonly UsageBucket[];
  /** The standing window's own edges. */
  window: UsageWindow;
  /** When the standing readings were last answered, absent while the first read is out. */
  updatedAt: number | undefined;
};

type LedgerAnswer = {
  data: UsageReport | undefined;
  error: Error | null;
  dataUpdatedAt: number;
};

type ReadingPlane = {
  held: readonly UsageBucket[];
  failure: Error | null;
  updatedAt: number | undefined;
};

function readingPlane(
  ask: UsageReportAsk | undefined,
  report: LedgerAnswer,
  liveRows: readonly LogRow[],
  now: number,
): ReadingPlane {
  if (ask === undefined) {
    return { held: liveWindowFold(liveRows, now), failure: null, updatedAt: now };
  }

  return {
    held: report.data?.buckets ?? [],
    failure: report.error,
    updatedAt: report.dataUpdatedAt === 0 ? undefined : report.dataUpdatedAt,
  };
}

function inWindow(buckets: readonly UsageBucket[], window: UsageWindow): readonly UsageBucket[] {
  return buckets.filter((bucket) => bucket.start >= window.from && bucket.start < window.to);
}

/**
 * The buckets one window stands over, from the ledger or from the renderer's own rows.
 *
 * @summary Both the readings and the filter menus fold from this one read, so a count in a menu
 * and a figure on a tile can never come from different windows. The live hour never reads the
 * ledger, which is what keeps the two planes from counting one request twice.
 */
export function useWindowBuckets(search: UsageSearch): WindowBuckets {
  const now = useDisplayTick(LIVE_TICK_MS);
  const ask = reportAskFor(search, now, new Date(now).getTimezoneOffset());
  const report = useQuery({
    ...usageReportQueryOptions(ask ?? { range: '24h' }),
    enabled: ask !== undefined,
  });
  const gateways = useQuery(gatewaysQueryOptions);
  const liveRows = useQueries({
    queries: (gateways.data ?? []).map((gateway) => engineLogsQueryOptions(gateway.slug)),
    combine: (results) => results.flatMap((result) => result.data ?? []),
  });
  const plane = readingPlane(ask, report, liveRows, now);
  const window = windowFor(search, now);

  return {
    now,
    ask,
    report: report.data,
    failure: plane.failure,
    buckets: inWindow(plane.held, window),
    previous: inWindow(plane.held, previousWindowFor(search, now)),
    window,
    updatedAt: plane.updatedAt,
  };
}
