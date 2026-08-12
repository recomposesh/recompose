import { useNavigate } from '@tanstack/react-router';

import type { UsageSearch } from '../../pages/usage';

import { UsageFilters } from '../../pages/usage';

/** The two filters the usage surface stands at the toolbar's leading edge. */
export function UsageFiltersAct({ search }: { search: UsageSearch }) {
  const navigate = useNavigate();

  return (
    <UsageFilters
      onSearchChange={(next) => {
        void navigate({ to: '/usage', search: next });
      }}
      search={search}
    />
  );
}
