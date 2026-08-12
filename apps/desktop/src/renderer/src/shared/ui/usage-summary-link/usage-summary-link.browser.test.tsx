import type { UsageReport } from '@recompose/contracts';
import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterContextProvider, createMemoryHistory } from '@tanstack/react-router';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { createAppRouter } from '../../../app/router';
import { installFakeBridge } from '../../testing';
import { UsageSummaryLink } from './usage-summary-link';

const HOUR_MS = 3_600_000;
const NOW_HOUR = Date.now() - (Date.now() % HOUR_MS);

const servedReport: UsageReport = {
  range: '24h',
  bucketWidth: 'hour',
  buckets: [
    {
      start: NOW_HOUR - HOUR_MS,
      tuple: { gateway: 'relay', provider: 'openai', accountId: 'work' },
      measures: {
        requests: 42,
        failed: 0,
        answered: 42,
        durationMsSum: 21_000,
        tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0, total: 900 },
      },
    },
  ],
  dayCosts: [],
  priceMisses: [],
  pricing: { source: 'bundled' },
};

async function mounted(ui: ReactNode) {
  installFakeBridge({ usageReport: servedReport });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createAppRouter({
    queryClient,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });

  return render(
    <RouterContextProvider router={router}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </RouterContextProvider>,
  );
}

test('a served gateway summarizes its day and links into the pre-filtered explorer', async () => {
  const screen = await mounted(<UsageSummaryLink scope={{ param: 'gateway', value: 'relay' }} />);

  const link = screen.getByRole('link', { name: /42 requests/ });

  await expect.element(link).toBeVisible();
  expect(link.element().getAttribute('href')).toContain('gateway=relay');
});

test('a served account links by its own level', async () => {
  const screen = await mounted(<UsageSummaryLink scope={{ param: 'account', value: 'work' }} />);

  const link = screen.getByRole('link', { name: /42 requests/ });

  await expect.element(link).toBeVisible();
  expect(link.element().getAttribute('href')).toContain('account=work');
});

test('a zero card reads zero and carries no link', async () => {
  const screen = await mounted(<UsageSummaryLink scope={{ param: 'gateway', value: 'quiet' }} />);

  await expect.element(screen.getByText(/No requests in the last 24 hours/)).toBeVisible();
  expect(screen.container.querySelector('a')).toBeNull();
});
