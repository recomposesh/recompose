import type { UsageBucket, UsageDayCost } from '@recompose/contracts';

import { useQuery } from '@tanstack/react-query';

import type { BucketWidthWord } from '../../lib/usage-caption';
import type { DrawnChart, MetricFaces } from '../../lib/usage-faces';
import type { UsageSearch } from '../../lib/usage-search';
import type { WindowBuckets } from '../../model/use-window-buckets';
import type { PanelRow } from '../breakdown-panel/breakdown-panel';

import {
  accountsQueryOptions,
  refusalSentence,
  settingsQueryOptions,
} from '../../../../shared/api';
import { accountLabelOf } from '../../lib/account-labels';
import { panelRowsOf } from '../../lib/panel-rows';
import { stackedChart } from '../../lib/usage-chart-fold';
import { metricFaces } from '../../lib/usage-faces';
import { filteredBuckets } from '../../lib/usage-groups';
import { previousWindowWord, windowFor } from '../../lib/usage-window';
import { useWindowBuckets } from '../../model/use-window-buckets';

function localMidnight(at: number): number {
  const day = new Date(at);

  day.setHours(0, 0, 0, 0);

  return day.getTime();
}

const PLACEHOLDER_FACES: MetricFaces = {
  requests: { reading: '—' },
  errors: { reading: '—' },
  latency: { reading: '—', detail: 'average' },
  tokens: { reading: '—' },
  spend: { reading: '—' },
};

export type UsagePanels = {
  gateway: readonly PanelRow[];
  virtualModel: readonly PanelRow[];
  target: readonly PanelRow[];
};

/** Why a fold came back empty: the window served nothing, or nothing has ever been served. */
export type UsageQuiet = 'quiet-window' | 'never-served';

export type UsageView =
  | { state: 'loading'; faces: MetricFaces }
  | { state: 'refused'; failure: string }
  | {
      state: 'readings';
      faces: MetricFaces;
      chart: DrawnChart;
      panels: UsagePanels;
      widthWord: BucketWidthWord;
      edgeAt: number | undefined;
      quiet: UsageQuiet | undefined;
    };

type Sourced = {
  buckets: readonly UsageBucket[];
  previous: readonly UsageBucket[];
  dayCosts: readonly UsageDayCost[];
  oldestRetainedStart: number | undefined;
  widthWord: BucketWidthWord;
};

function targetNameOf(key: string, nameOfAccount: (id: string) => string): string {
  const seam = key.indexOf(' ');

  return `${key.slice(0, seam)} · ${nameOfAccount(key.slice(seam + 1))}`;
}

function panelsOf(
  buckets: readonly UsageBucket[],
  nameOfAccount: (id: string) => string,
): UsagePanels {
  return {
    gateway: panelRowsOf(buckets, 'gateway', (key) => key),
    virtualModel: panelRowsOf(buckets, 'virtualModel', (key) => key),
    target: panelRowsOf(buckets, 'target', (key) => targetNameOf(key, nameOfAccount)),
  };
}

function quietOf(reading: { folded: number; everServed: boolean }): UsageQuiet | undefined {
  if (reading.folded > 0) {
    return undefined;
  }

  return reading.everServed ? 'quiet-window' : 'never-served';
}

function readingsView(
  search: UsageSearch,
  sourced: Sourced,
  nameOfAccount: (id: string) => string,
  now: number,
  everServed: boolean,
): UsageView {
  const kept = filteredBuckets(sourced.buckets, search);

  return {
    state: 'readings',
    quiet: quietOf({ folded: kept.length + sourced.dayCosts.length, everServed }),
    faces: metricFaces({
      buckets: kept,
      previous: filteredBuckets(sourced.previous, search),
      dayCosts: sourced.dayCosts,
      dayWidth: sourced.widthWord === 'day',
      todayStart: localMidnight(now),
      windowWord: previousWindowWord(search.range),
    }),
    chart: stackedChart({
      measure: search.metric,
      buckets: kept,
      dayCosts: sourced.dayCosts,
      stackedBy: search.stackedBy,
      nameOf: (key) => (search.stackedBy === 'account' ? nameOfAccount(key) : key),
      bucketWidth: sourced.widthWord,
      window: windowFor(search, now),
    }),
    panels: panelsOf(kept, nameOfAccount),
    widthWord: sourced.widthWord,
    edgeAt: sourced.oldestRetainedStart,
  };
}

function widthWordOf(
  search: UsageSearch,
  reportWidth: 'hour' | 'day' | undefined,
): BucketWidthWord {
  if (search.range === '1h') {
    return 'minute';
  }

  return search.metric === 'spend' ? 'day' : (reportWidth ?? 'hour');
}

function stillReading(held: WindowBuckets): boolean {
  return held.ask !== undefined && held.report === undefined;
}

function unreadableView(held: WindowBuckets): UsageView | undefined {
  if (held.failure !== null) {
    return { state: 'refused', failure: refusalSentence(held.failure) };
  }

  return stillReading(held) ? { state: 'loading', faces: PLACEHOLDER_FACES } : undefined;
}

function sourcedFrom(search: UsageSearch, held: WindowBuckets): Sourced {
  return {
    buckets: held.buckets,
    previous: held.previous,
    dayCosts: held.report?.dayCosts ?? [],
    oldestRetainedStart: held.report?.oldestRetainedStart,
    widthWord: widthWordOf(search, held.report?.bucketWidth),
  };
}

function viewOf(
  search: UsageSearch,
  held: WindowBuckets,
  nameOfAccount: (id: string) => string,
  everServed: boolean,
): UsageView {
  return (
    unreadableView(held) ??
    readingsView(search, sourcedFrom(search, held), nameOfAccount, held.now, everServed)
  );
}

/**
 * The whole view one address stands for, the instant it reads against, and how fresh it stands.
 *
 * @summary Missing data reads as missing: pending history is a loading view of placeholders, a
 * refused read carries its sentence, and a ledger window that served nothing says so rather than
 * drawing an empty chart. The live hour keeps its readings either way, because a person watching
 * it is waiting for the first request to land in them.
 */
export function useUsageView(search: UsageSearch): {
  view: UsageView;
  now: number;
  updatedAt: number | undefined;
} {
  const held = useWindowBuckets(search);
  const accounts = useQuery(accountsQueryOptions);
  const settings = useQuery(settingsQueryOptions);
  const nameOfAccount = (accountId: string) => accountLabelOf(accounts.data, accountId);
  const everServed = settings.data?.firstRequestServed ?? true;

  return {
    view: viewOf(search, held, nameOfAccount, everServed),
    now: held.now,
    updatedAt: held.updatedAt,
  };
}
