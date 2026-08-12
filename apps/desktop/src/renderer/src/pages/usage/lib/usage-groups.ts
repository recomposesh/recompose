import type { UsageBucket, UsageMeasures, UsageTuple } from '@recompose/contracts';

import { summedUsageMeasures } from '@recompose/contracts';

import type { UsageSearch } from './usage-search';

export type GroupDimension = 'gateway' | 'virtualModel' | 'provider' | 'account' | 'target';

export type BreakdownRow = {
  key: string | undefined;
  measures: UsageMeasures;
  share: number;
};

export type MemberName = { key: string; requests: number };

const TUPLE_FIELD_BY_DIMENSION: Record<GroupDimension, (tuple: UsageTuple) => string | undefined> =
  {
    gateway: (tuple) => tuple.gateway,
    virtualModel: (tuple) => tuple.virtualModel,
    provider: (tuple) => tuple.provider,
    account: (tuple) => tuple.accountId,
    target: (tuple) =>
      tuple.accountId === undefined || tuple.providerModel === undefined
        ? undefined
        : `${tuple.providerModel} ${tuple.accountId}`,
  };

/** The member one bucket answers to on one dimension, absent where its traffic never reached it. */
export function memberOf(tuple: UsageTuple, dimension: GroupDimension): string | undefined {
  return TUPLE_FIELD_BY_DIMENSION[dimension](tuple);
}

/**
 * The buckets both standing filters keep.
 *
 * @summary A filter standing on everything keeps everything, and two standing filters narrow
 * together rather than either alone, so the window a figure reads is the window the header names.
 */
export function filteredBuckets(
  buckets: readonly UsageBucket[],
  search: UsageSearch,
): readonly UsageBucket[] {
  const keptGateways = search.gateways === undefined ? undefined : new Set(search.gateways);
  const keptAccounts = search.providers === undefined ? undefined : new Set(search.providers);

  return buckets.filter((bucket) => {
    const accountId = bucket.tuple.accountId;
    const gatewayKept = keptGateways === undefined || keptGateways.has(bucket.tuple.gateway);
    const providerKept =
      keptAccounts === undefined || (accountId !== undefined && keptAccounts.has(accountId));

    return gatewayKept && providerKept;
  });
}

/**
 * The buckets folded onto one dimension, largest request count first.
 *
 * @summary Every panel and the chart fold out of the same tuple-keyed buckets, so no two readings
 * of one window can disagree. Traffic that never reached the dimension, a gateway-raised failure
 * folded by account for one, keeps its measures under an unnamed key rather than vanishing.
 */
export function groupedBy(
  buckets: readonly UsageBucket[],
  dimension: GroupDimension,
): readonly BreakdownRow[] {
  const grouped = new Map<string | undefined, UsageMeasures>();

  for (const bucket of buckets) {
    const key = memberOf(bucket.tuple, dimension);
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

/** The named members one dimension served, largest first, which is what a filter menu lists. */
export function memberNames(
  buckets: readonly UsageBucket[],
  dimension: GroupDimension,
): readonly MemberName[] {
  return groupedBy(buckets, dimension).flatMap((row) =>
    row.key === undefined ? [] : [{ key: row.key, requests: row.measures.requests }],
  );
}
