import type { IpcEventPayload } from '@recompose/contracts';

import type {
  ScopeLevel,
  UsageMetric,
  UsageSearch,
  UsageSearchRange,
} from '../../lib/usage-search';
import type { BreakdownFace } from '../breakdown-table/breakdown-table';
import type { UsageView } from './use-usage-view';

import { compactCount, exactCount } from '../../../../shared/lib';
import { spendReading } from '../../lib/usage-faces';
import { groupedBy, tupleMatchesScope } from '../../lib/usage-groups';
import { SCOPE_LEVELS, narrowedScope, spendSnappedRange } from '../../lib/usage-search';

const LEVEL_WORDING: Record<ScopeLevel, string> = {
  gateway: 'gateway',
  virtualModel: 'virtual model',
  providerModel: 'model',
  provider: 'provider',
  account: 'account',
};

type ReadingsView = Extract<UsageView, { state: 'readings' }>;

function rowSpend(view: ReadingsView, level: ScopeLevel, key: string | undefined): string {
  if (!view.spendColumn || key === undefined) {
    return '';
  }

  const costs = view.dayCosts.filter((cost) => tupleMatchesScope(cost.tuple, { [level]: key }));
  const figures = spendReading(costs);

  return [figures.billed, figures.equivalent].filter(Boolean).join(' · ');
}

/**
 * The pivot rows printed for the breakdown table.
 *
 * @summary Spend rides a row only where a basis stands, a row whose traffic never reached the
 * level keeps its measures under a printed absence, and only rows that can narrow further offer
 * the drill.
 */
export function breakdownFacesOf(view: ReadingsView, level: ScopeLevel): readonly BreakdownFace[] {
  return groupedBy(view.buckets, level).map((row) => {
    const spend = rowSpend(view, level, row.key);

    return {
      key: row.key,
      name: row.key ?? `No ${LEVEL_WORDING[level]}`,
      requests: exactCount(row.measures.requests),
      tokens: compactCount(row.measures.tokens.total),
      ...(spend === '' ? {} : { spend }),
      share: row.share,
      drillable: level !== 'account' && row.key !== undefined,
    };
  });
}

/** The search with only the leading scope levels kept, zero clearing them all. */
export function truncatedSearch(search: UsageSearch, keptCount: number): UsageSearch {
  const kept = narrowedScope(search).slice(0, Math.max(0, keptCount));
  const cleared: UsageSearch = { range: search.range, metric: search.metric };

  return kept.reduce((next, one) => ({ ...next, [one.level]: one.value }), cleared);
}

/** The level a drill regroups by, one step deeper until the hierarchy ends. */
export function nextLevelAfter(level: ScopeLevel): ScopeLevel {
  const place = SCOPE_LEVELS.indexOf(level);

  return SCOPE_LEVELS[place + 1] ?? level;
}

type UsageCommand = IpcEventPayload<'usage:command'>;

const RANGE_BY_COMMAND: Readonly<Partial<Record<UsageCommand, UsageSearchRange>>> = {
  'range-24h': '24h',
  'range-7d': '7d',
  'range-30d': '30d',
};

const METRIC_BY_COMMAND: Readonly<Partial<Record<UsageCommand, UsageMetric>>> = {
  'metric-requests': 'requests',
  'metric-errors': 'errors',
  'metric-latency': 'latency',
  'metric-tokens': 'tokens',
  'metric-spend': 'spend',
};

/**
 * The view a menu command moves the address to, or nothing for the commands that move no view.
 *
 * @summary Menu picks travel the same search the controls write, so a command and a press can
 * never disagree: a metric pick carries the spend snap, and a range pick moves every reading.
 */
export function movedSearch(command: UsageCommand, search: UsageSearch): UsageSearch | undefined {
  const range = RANGE_BY_COMMAND[command];

  if (range !== undefined) {
    return { ...search, range };
  }

  const metric = METRIC_BY_COMMAND[command];

  if (metric !== undefined) {
    return {
      ...search,
      metric,
      range: metric === 'spend' ? spendSnappedRange(search.range) : search.range,
    };
  }

  return undefined;
}
