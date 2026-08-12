import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

import type { UsageSearch } from '../../pages/usage';

import { RangeControl } from '../../pages/usage';
import { settingsQueryOptions } from '../../shared/api';
import { useDisplayTick } from '../../shared/lib';

const DEFAULT_RETENTION_DAYS = 30;
const MINUTE_MS = 60_000;

/**
 * The window control the usage surface stands at the toolbar's trailing edge.
 *
 * @summary The control never claims a window it cannot draw: a range wider than the retention
 * window stays reachable but unmovable, with the window named as the reason.
 */
export function UsageRangeAct({ search }: { search: UsageSearch }) {
  const settings = useQuery(settingsQueryOptions);
  const now = useDisplayTick(MINUTE_MS);
  const navigate = useNavigate();

  return (
    <RangeControl
      now={now}
      onSearchChange={(next) => {
        void navigate({ to: '/usage', search: next });
      }}
      retentionDays={settings.data?.usageRetentionDays ?? DEFAULT_RETENTION_DAYS}
      search={search}
    />
  );
}
