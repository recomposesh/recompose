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

/**
 * The key traffic that reached no member of a dimension is listed and filtered under.
 *
 * @summary A gateway refusing before any provider answered reached no account, and those requests
 * are exactly the ones a person comes to the explorer to find. The panels already name that
 * absence, so the filter menus name it too rather than dropping the rows out of the only control
 * that could isolate them. The parentheses are what keep it apart from every real member: a gateway
 * slug is lowercase letters, digits and dashes, and an account id is the registry's own `acc-` form.
 */
export const ABSENT_MEMBER_KEY = '(none)';

/** What each dimension calls the traffic that never reached it, in one wording every reader shares. */
export const ABSENCE_WORDING: Readonly<Record<GroupDimension, string>> = {
  gateway: 'No gateway',
  virtualModel: 'Direct traffic',
  provider: 'No provider reached',
  account: 'No account reached',
  target: 'No target reached',
};

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

function standingOn(kept: ReadonlySet<string> | undefined, member: string | undefined): boolean {
  if (kept === undefined) {
    return true;
  }

  return kept.has(member ?? ABSENT_MEMBER_KEY);
}

/**
 * The buckets both standing filters keep.
 *
 * @summary A filter standing on everything keeps everything, and two standing filters narrow
 * together rather than either alone, so the window a figure reads is the window the header names.
 * Traffic that reached no account answers to the absent member, so picking it narrows onto the
 * requests a gateway refused before any provider stood for them.
 */
export function filteredBuckets(
  buckets: readonly UsageBucket[],
  search: UsageSearch,
): readonly UsageBucket[] {
  const keptGateways = search.gateways === undefined ? undefined : new Set(search.gateways);
  const keptAccounts = search.providers === undefined ? undefined : new Set(search.providers);

  return buckets.filter(
    (bucket) =>
      standingOn(keptGateways, bucket.tuple.gateway) &&
      standingOn(keptAccounts, bucket.tuple.accountId),
  );
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

/**
 * The members one dimension served, largest first, which is what a filter menu lists.
 *
 * @summary Traffic that reached no member answers to the absent key rather than being dropped,
 * because a menu that hides it reads as a window that served nothing while the tiles beside it
 * count the very same requests.
 */
export function memberNames(
  buckets: readonly UsageBucket[],
  dimension: GroupDimension,
): readonly MemberName[] {
  return groupedBy(buckets, dimension).map((row) => ({
    key: row.key ?? ABSENT_MEMBER_KEY,
    requests: row.measures.requests,
  }));
}
