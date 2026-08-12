import type {
  AccountBalance,
  QuotaWindow,
  UsageBucket,
  UsageDayCost,
  UsageRange,
  UsageReport,
} from '@recompose/contracts';

import { useQueries, useQuery } from '@tanstack/react-query';

import type { DrawnChart, MetricFaces } from '../../lib/usage-faces';
import type { UsageSearch } from '../../lib/usage-search';

import {
  accountsQueryOptions,
  balancesQueryOptions,
  engineLogsQueryOptions,
  gatewaysQueryOptions,
  quotaWindowsQueryOptions,
  refusalSentence,
  usageReportQueryOptions,
} from '../../../../shared/api';
import { useDisplayTick } from '../../../../shared/lib';
import { liveWindowFold } from '../../lib/live-window';
import { captionFor } from '../../lib/usage-caption';
import { chartFor, metricFaces } from '../../lib/usage-faces';
import { scopedBuckets, tupleMatchesScope } from '../../lib/usage-groups';
import { narrowedScope } from '../../lib/usage-search';

const DAY_MS = 86_400_000;
const LIVE_TICK_MS = 10_000;

const PLACEHOLDER_FACES: MetricFaces = {
  requests: { reading: '—' },
  errors: { reading: '—' },
  latency: { reading: '—', detail: 'average' },
  tokens: { reading: '—' },
  spend: { reading: '—' },
};

export type UsageView =
  | { state: 'promise' }
  | { state: 'loading'; faces: MetricFaces }
  | { state: 'refused'; failure: string }
  | { state: 'scoped-empty'; sentence: string }
  | {
      state: 'readings';
      faces: MetricFaces;
      chart: DrawnChart;
      caption: string;
      buckets: readonly UsageBucket[];
      dayCosts: readonly UsageDayCost[];
      edgeAt: number | undefined;
      spendColumn: boolean;
    };

export type UsageStrips = {
  windows: readonly QuotaWindow[];
  balances: readonly AccountBalance[];
  accountNameOf: (accountId: string) => string;
  now: number;
};

const LEVEL_WORDING = {
  gateway: 'gateway',
  virtualModel: 'virtual model',
  providerModel: 'model',
  provider: 'provider',
  account: 'account',
} as const;

const RANGE_SENTENCE_WORDING = {
  '1h': 'hour',
  '24h': '24 hours',
  '7d': '7 days',
  '30d': '30 days',
} as const;

function emptyScopeSentence(search: UsageSearch): string {
  const deepest = narrowedScope(search).at(-1);
  const level = deepest === undefined ? 'gateway' : deepest.level;

  return `Nothing served through this ${LEVEL_WORDING[level]} in the last ${RANGE_SENTENCE_WORDING[search.range]}`;
}

type SourcedWindow = {
  buckets: readonly UsageBucket[];
  dayCosts: readonly UsageDayCost[];
  oldestRetainedStart: number | undefined;
};

type ScopedWindow = {
  buckets: readonly UsageBucket[];
  dayCosts: readonly UsageDayCost[];
};

function nothingEverServed(sourced: SourcedWindow, search: UsageSearch): boolean {
  return sourced.buckets.length === 0 && sourced.dayCosts.length === 0 && search.range !== '1h';
}

function quietView(
  search: UsageSearch,
  sourced: SourcedWindow,
  scoped: ScopedWindow,
): UsageView | undefined {
  const standing = narrowedScope(search).length;

  if (standing === 0) {
    return nothingEverServed(sourced, search) ? { state: 'promise' } : undefined;
  }

  if (scoped.buckets.length === 0 && scoped.dayCosts.length === 0) {
    return { state: 'scoped-empty', sentence: emptyScopeSentence(search) };
  }

  return undefined;
}

function retentionEdge(chart: DrawnChart, edge: number | undefined): number | undefined {
  if (edge === undefined) {
    return undefined;
  }

  return chart.bars.find((bar) => bar.at >= edge)?.at;
}

function readingsView(search: UsageSearch, sourced: SourcedWindow, now: number): UsageView {
  const scoped: ScopedWindow = {
    buckets: scopedBuckets(sourced.buckets, search),
    dayCosts: sourced.dayCosts.filter((cost) => tupleMatchesScope(cost.tuple, search)),
  };
  const quiet = quietView(search, sourced, scoped);

  if (quiet !== undefined) {
    return quiet;
  }

  const dayWidth = search.range === '7d' || search.range === '30d';
  const todayStart = now - (now % DAY_MS);
  const faces = metricFaces({ ...scoped, dayWidth, todayStart });
  const chart = chartFor(search.metric, scoped.buckets, scoped.dayCosts, todayStart);

  return {
    state: 'readings',
    faces,
    chart,
    caption: captionFor(search.metric, search.range, faces, chart.bars),
    buckets: scoped.buckets,
    dayCosts: scoped.dayCosts,
    edgeAt: retentionEdge(chart, sourced.oldestRetainedStart),
    spendColumn: dayWidth,
  };
}

/**
 * The whole view one address stands for, plus the strips that ride beside every state.
 *
 * @summary The `1h` range folds the renderer's own row cache and never reads the ledger; every
 * longer range answers from closed buckets. Missing data reads as missing: pending history is a
 * loading view of placeholders, a refused read carries its sentence, and an empty scope names its
 * own way out.
 */
type LedgerAnswer = {
  data: UsageReport | undefined;
  error: Error | null;
};

function ledgerView(search: UsageSearch, report: LedgerAnswer, now: number): UsageView {
  if (report.error !== null) {
    return { state: 'refused', failure: refusalSentence(report.error) };
  }

  if (report.data === undefined) {
    return { state: 'loading', faces: PLACEHOLDER_FACES };
  }

  return readingsView(
    search,
    {
      buckets: report.data.buckets,
      dayCosts: report.data.dayCosts,
      oldestRetainedStart: report.data.oldestRetainedStart,
    },
    now,
  );
}

function accountLabelOf(
  accounts: { accounts: readonly { id: string }[] } | undefined,
  accountId: string,
): string {
  const held = accounts?.accounts.find((account) => account.id === accountId);

  return held !== undefined && 'label' in held && typeof held.label === 'string'
    ? held.label
    : accountId;
}

function stripsOf(
  windows: readonly QuotaWindow[] | undefined,
  balances: readonly AccountBalance[] | undefined,
  accounts: { accounts: readonly { id: string }[] } | undefined,
  now: number,
): UsageStrips {
  return {
    windows: windows ?? [],
    balances: balances ?? [],
    accountNameOf: (accountId) => accountLabelOf(accounts, accountId),
    now,
  };
}

export function useUsageView(search: UsageSearch): { view: UsageView; strips: UsageStrips } {
  const now = useDisplayTick(LIVE_TICK_MS);
  const ledgerRange: UsageRange = search.range === '1h' ? '24h' : search.range;
  const report = useQuery({
    ...usageReportQueryOptions(ledgerRange),
    enabled: search.range !== '1h',
  });
  const quota = useQuery(quotaWindowsQueryOptions);
  const balances = useQuery(balancesQueryOptions);
  const accounts = useQuery(accountsQueryOptions);
  const gateways = useQuery(gatewaysQueryOptions);
  const liveRows = useQueries({
    queries: (gateways.data ?? []).map((gateway) => engineLogsQueryOptions(gateway.slug)),
    combine: (results) => results.flatMap((result) => result.data ?? []),
  });

  const strips = stripsOf(quota.data, balances.data, accounts.data, now);

  if (search.range === '1h') {
    const live: SourcedWindow = {
      buckets: liveWindowFold(liveRows, now),
      dayCosts: [],
      oldestRetainedStart: undefined,
    };

    return { view: readingsView(search, live, now), strips };
  }

  return { view: ledgerView(search, report, now), strips };
}
