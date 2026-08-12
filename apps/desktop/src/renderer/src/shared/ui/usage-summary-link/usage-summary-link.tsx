import type { UsageBucket } from '@recompose/contracts';

import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';

import { usageReportQueryOptions } from '../../api';
import { exactCount, pluralized } from '../../lib';

type UsageScopeLink = {
  /** The filter the link narrows the explorer by. */
  param: 'gateways' | 'providers';
  /** The value the level stands at. */
  value: string;
};

type UsageSummaryLinkProps = {
  /** The one level the summary reads and the link carries. */
  scope: UsageScopeLink;
};

function scopedRequests(buckets: readonly UsageBucket[], scope: UsageScopeLink): number {
  return buckets
    .filter((bucket) =>
      scope.param === 'gateways'
        ? bucket.tuple.gateway === scope.value
        : bucket.tuple.accountId === scope.value,
    )
    .reduce((sum, bucket) => sum + bucket.measures.requests, 0);
}

/**
 * One surface's served day in one line, opening the usage explorer pre-filtered.
 *
 * @summary A card reading zero never links into an empty view: the link only stands once the
 * scope has something for the explorer to show.
 */
export function UsageSummaryLink({ scope }: UsageSummaryLinkProps) {
  const report = useQuery(usageReportQueryOptions({ range: '24h' }));
  const requests = scopedRequests(report.data?.buckets ?? [], scope);

  if (requests === 0) {
    return <p className="text-detail text-ink-secondary">No requests in the last 24 hours</p>;
  }

  return (
    <Link
      className="rounded-control focus-ring px-1 text-detail text-ink-secondary row-hover"
      search={{
        range: '24h',
        metric: 'requests',
        stackedBy: 'gateway',
        [scope.param]: [scope.value],
      }}
      to="/usage"
    >
      {exactCount(requests)} {pluralized(requests, 'request')} in the last 24 hours →
    </Link>
  );
}
