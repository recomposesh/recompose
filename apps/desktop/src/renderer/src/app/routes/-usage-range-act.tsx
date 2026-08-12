import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

import type { UsageSearch, UsageSearchRange } from '../../pages/usage';

import { settingsQueryOptions } from '../../shared/api';
import { SegmentedControl } from '../../shared/ui';

type RangeOption = {
  value: UsageSearchRange;
  label: string;
  inertReason?: string | undefined;
};

function rangeOptions(retentionDays: number): readonly RangeOption[] {
  const pastRetention =
    retentionDays < 30
      ? { inertReason: `Usage retention holds ${String(retentionDays)} days` }
      : {};

  return [
    { value: '1h', label: '1h' },
    { value: '24h', label: '24h' },
    { value: '7d', label: '7d' },
    { value: '30d', label: '30d', ...pastRetention },
  ];
}

/**
 * The range control the usage surface stands at the toolbar's trailing edge.
 *
 * @summary The control never claims a view it cannot draw: a range wider than the retention
 * window stays reachable but unmovable, with the window named as the reason.
 */
export function UsageRangeAct({ search }: { search: UsageSearch }) {
  const navigate = useNavigate();
  const settings = useQuery(settingsQueryOptions);
  const retentionDays = settings.data?.usageRetentionDays ?? 30;

  return (
    <SegmentedControl
      label="Range"
      onChangeValue={(range) => {
        void navigate({ to: '/usage', search: { ...search, range } });
      }}
      options={rangeOptions(retentionDays)}
      value={search.range}
    />
  );
}
