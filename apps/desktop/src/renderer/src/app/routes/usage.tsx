import type { SearchSchemaInput } from '@tanstack/react-router';

import { createFileRoute, useNavigate } from '@tanstack/react-router';

import { UsagePage, reportAskFor, usageSearchFrom } from '../../pages/usage';
import { warmedUsageReport } from '../../shared/api';
import { PageError } from '../../shared/ui';

export const Route = createFileRoute('/usage')({
  validateSearch: (raw: Record<string, unknown> & SearchSchemaInput) => usageSearchFrom(raw),
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ context, deps }) => {
    const now = Date.now();

    return warmedUsageReport(
      context.queryClient,
      reportAskFor(deps.search, now, new Date(now).getTimezoneOffset()),
    );
  },
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
