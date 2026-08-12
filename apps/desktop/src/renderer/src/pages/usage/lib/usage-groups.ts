import type { UsageBucket, UsageMeasures, UsageTuple } from '@recompose/contracts';

import { summedUsageMeasures } from '@recompose/contracts';

import type { ScopeLevel, UsageScope } from './usage-search';

import { SCOPE_LEVELS } from './usage-search';

export type BreakdownRow = {
  key: string | undefined;
  measures: UsageMeasures;
  share: number;
};

const TUPLE_FIELD_BY_LEVEL: Record<ScopeLevel, (tuple: UsageTuple) => string | undefined> = {
  gateway: (tuple) => tuple.gateway,
  virtualModel: (tuple) => tuple.virtualModel,
  providerModel: (tuple) => tuple.providerModel,
  provider: (tuple) => tuple.provider,
  account: (tuple) => tuple.accountId,
};

/** Whether a tuple matches every standing scope level. */
export function tupleMatchesScope(tuple: UsageTuple, scope: UsageScope): boolean {
  return SCOPE_LEVELS.every((level) => {
    const value = scope[level];

    return value === undefined || TUPLE_FIELD_BY_LEVEL[level](tuple) === value;
  });
}

/**
 * The buckets pivoted onto one hierarchy level, largest request count first.
 *
 * @summary Every group-by the explorer offers folds out of the same tuple-keyed buckets, so the
 * tiles, the chart, and the breakdown can never disagree. A bucket whose traffic never reached the
 * level, a gateway-raised failure grouped by provider for one, keeps its measures under an
 * undefined key rather than vanishing.
 */
export function groupedBy(
  buckets: readonly UsageBucket[],
  level: ScopeLevel,
): readonly BreakdownRow[] {
  const valueOf = TUPLE_FIELD_BY_LEVEL[level];
  const grouped = new Map<string | undefined, UsageMeasures>();

  for (const bucket of buckets) {
    const key = valueOf(bucket.tuple);
    const held = grouped.get(key);

    grouped.set(
      key,
      held === undefined ? bucket.measures : summedUsageMeasures(held, bucket.measures),
    );
  }

  const total = [...grouped.values()].reduce((sum, measures) => sum + measures.requests, 0);

  return [...grouped.entries()]
    .map(([key, measures]) => ({
      key,
      measures,
      share: total === 0 ? 0 : measures.requests / total,
    }))
    .toSorted((larger, smaller) => smaller.measures.requests - larger.measures.requests);
}

/** The buckets whose tuple matches every standing scope level. */
export function scopedBuckets(
  buckets: readonly UsageBucket[],
  scope: UsageScope,
): readonly UsageBucket[] {
  return buckets.filter((bucket) => tupleMatchesScope(bucket.tuple, scope));
}
