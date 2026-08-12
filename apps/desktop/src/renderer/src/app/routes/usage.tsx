import type { SearchSchemaInput } from '@tanstack/react-router';

import { createFileRoute, useNavigate } from '@tanstack/react-router';

import { UsagePage, usageSearchFrom } from '../../pages/usage';
import { warmedUsageReport } from '../../shared/api';
import { PageError } from '../../shared/ui';

export const Route = createFileRoute('/usage')({
  validateSearch: (raw: Record<string, unknown> & SearchSchemaInput) => usageSearchFrom(raw),
  loaderDeps: ({ search }) => ({ range: search.range }),
  loader: async ({ context, deps }) => warmedUsageReport(context.queryClient, deps.range),
  component: UsageRoute,
  errorComponent: PageError,
});

function UsageRoute() {
  const search = Route.useSearch();
  const navigate = useNavigate();

  return (
    <UsagePage
      onSearchChange={(next) => {
        void navigate({ to: '/usage', search: next });
      }}
      search={search}
    />
  );
}
