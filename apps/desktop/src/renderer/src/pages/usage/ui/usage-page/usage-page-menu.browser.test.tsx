import type { UsageBucket, UsageReport } from '@recompose/contracts';
import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import type { UsageSearch } from '../../lib/usage-search';

import { emitUsageCommand, installFakeBridge } from '../../../../shared/testing';
import { UsagePage } from './usage-page';

const HOUR_MS = 3_600_000;
const NOW_HOUR = Date.now() - (Date.now() % HOUR_MS);

function servedBucket(start: number): UsageBucket {
  return {
    start,
    tuple: { gateway: 'relay', virtualModel: 'creative' },
    measures: {
      requests: 5,
      failed: 0,
      answered: 5,
      durationMsSum: 2_500,
      tokens: { input: 100, output: 50, cacheRead: 20, cacheWrite: 0, reasoning: 0, total: 170 },
    },
  };
}

const servedReport: UsageReport = {
  range: '7d',
  bucketWidth: 'hour',
  buckets: [servedBucket(NOW_HOUR - HOUR_MS), servedBucket(NOW_HOUR - 2 * HOUR_MS)],
  dayCosts: [],
  priceMisses: [],
  pricing: { source: 'bundled' },
};

const at7d: UsageSearch = { range: '7d', metric: 'requests', stackedBy: 'gateway' };

async function mounted(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

test('a range command from the menu moves the address', async () => {
  installFakeBridge({ usageReport: servedReport });

  const onSearchChange = vi.fn<(next: UsageSearch) => void>();
  const screen = await mounted(<UsagePage onSearchChange={onSearchChange} search={at7d} />);

  await expect.element(screen.getByRole('region', { name: 'Requests over time' })).toBeVisible();

  emitUsageCommand('range-30d');

  expect(onSearchChange).toHaveBeenCalledWith({ ...at7d, range: '30d' });
});

test('a measure command moves the chart, snapping spend onto day width', async () => {
  installFakeBridge({ usageReport: servedReport });

  const onSearchChange = vi.fn<(next: UsageSearch) => void>();
  const screen = await mounted(
    <UsagePage
      onSearchChange={onSearchChange}
      search={{ range: '24h', metric: 'requests', stackedBy: 'gateway' }}
    />,
  );

  await expect.element(screen.getByRole('region', { name: 'Requests over time' })).toBeVisible();

  emitUsageCommand('metric-spend');

  expect(onSearchChange).toHaveBeenCalledWith({
    range: '7d',
    metric: 'spend',
    stackedBy: 'gateway',
  });
});

test('the table twin toggles from the menu and reports its standing back', async () => {
  const reported: boolean[] = [];

  installFakeBridge({
    usageReport: servedReport,
    overrides: {
      'system:usage-table': async ({ open }) => {
        reported.push(open);

        return Promise.resolve({ ok: true, value: undefined });
      },
    },
  });

  const screen = await mounted(<UsagePage onSearchChange={() => {}} search={at7d} />);

  await expect.element(screen.getByRole('region', { name: 'Requests over time' })).toBeVisible();
  expect(screen.container.querySelector('table')).toBeNull();

  emitUsageCommand('toggle-table-twin');

  await expect
    .element(screen.getByRole('table', { name: 'Requests over time' }))
    .toBeInTheDocument();
  await vi.waitFor(() => {
    expect(reported).toContain(true);
  });

  const reportedBeforeClosing = reported.length;

  emitUsageCommand('toggle-table-twin');

  await vi.waitFor(() => {
    expect(reported.length).toBeGreaterThan(reportedBeforeClosing);
    expect(reported.at(-1)).toBe(false);
    expect(screen.container.querySelector('table')).toBeNull();
  });
});

test('refresh asks the ledger again', async () => {
  let answered = 0;

  installFakeBridge({
    usageReport: servedReport,
    overrides: {
      'usage:report': async (request) => {
        answered += 1;

        return Promise.resolve({ ok: true, value: { ...servedReport, range: request.range } });
      },
    },
  });

  const screen = await mounted(<UsagePage onSearchChange={() => {}} search={at7d} />);

  await expect.element(screen.getByRole('region', { name: 'Requests over time' })).toBeVisible();

  const before = answered;

  emitUsageCommand('refresh');

  await vi.waitFor(() => {
    expect(answered).toBeGreaterThan(before);
  });
});
