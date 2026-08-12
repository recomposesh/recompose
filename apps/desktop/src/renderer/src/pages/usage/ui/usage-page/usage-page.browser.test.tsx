import type { UsageBucket, UsageReport } from '@recompose/contracts';
import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import type { UsageSearch } from '../../lib/usage-search';

import { installFakeBridge } from '../../../../shared/testing';
import { UsagePage } from './usage-page';

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
const NOW_HOUR = Date.now() - (Date.now() % HOUR_MS);
const DAY_START = NOW_HOUR - (NOW_HOUR % DAY_MS);

function servedBucket(start: number, gateway: string, requests: number): UsageBucket {
  return {
    start,
    tuple: { gateway, virtualModel: 'creative' },
    measures: {
      requests,
      failed: 1,
      answered: requests,
      durationMsSum: requests * 500,
      tokens: {
        input: 500,
        output: 250,
        cacheRead: 200,
        cacheWrite: 50,
        reasoning: 0,
        total: 1_000,
      },
    },
  };
}

const servedReport: UsageReport = {
  range: '7d',
  bucketWidth: 'hour',
  buckets: [
    servedBucket(NOW_HOUR - 2 * HOUR_MS, 'relay', 9),
    servedBucket(NOW_HOUR - HOUR_MS, 'backup', 3),
  ],
  dayCosts: [
    {
      dayStart: DAY_START,
      tuple: { gateway: 'relay', accountKind: 'api-key' },
      billedMicroDollars: 1_920_000,
    },
  ],
  priceMisses: [],
  pricing: { source: 'bundled' },
};

async function mounted(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const at7d: UsageSearch = { range: '7d', metric: 'requests' };

test('before any traffic the promise card stands as the whole body', async () => {
  installFakeBridge({});

  const screen = await mounted(<UsagePage onSearchChange={() => {}} search={at7d} />);

  await expect
    .element(screen.getByRole('heading', { level: 2, name: 'No requests yet' }))
    .toBeVisible();
  expect(screen.container.querySelector('table')).toBeNull();
  expect(screen.container.querySelector('[role="radiogroup"]')).toBeNull();
});

test('served history lands in the tiles, the chart, and the breakdown together', async () => {
  installFakeBridge({ usageReport: servedReport });

  const screen = await mounted(<UsagePage onSearchChange={() => {}} search={at7d} />);

  await expect.element(screen.getByRole('radio', { name: /Requests/ })).toBeVisible();
  await expect.element(screen.getByText('12', { exact: true })).toBeVisible();
  await expect.element(screen.getByRole('img', { name: /Requests/ })).toBeInTheDocument();
  await expect.element(screen.getByRole('table', { name: 'Breakdown' })).toBeInTheDocument();
  await expect.element(screen.getByRole('cell', { name: 'relay', exact: true })).toBeVisible();
  await expect
    .element(screen.getByText(/Last 7 days.*hour buckets.*12 requests total.*peak 9.*UTC/))
    .toBeVisible();
});

test('selecting spend snaps a sub-day range onto day width', async () => {
  installFakeBridge({ usageReport: servedReport });

  const onSearchChange = vi.fn<(next: UsageSearch) => void>();
  const screen = await mounted(
    <UsagePage onSearchChange={onSearchChange} search={{ range: '24h', metric: 'requests' }} />,
  );

  await screen.getByRole('radio', { name: /Spend/ }).click();

  expect(onSearchChange).toHaveBeenCalledWith({ range: '7d', metric: 'spend' });
});

test('drilling a breakdown row narrows the scope by its level', async () => {
  installFakeBridge({ usageReport: servedReport });

  const onSearchChange = vi.fn<(next: UsageSearch) => void>();
  const screen = await mounted(<UsagePage onSearchChange={onSearchChange} search={at7d} />);

  await screen.getByRole('button', { name: 'Drill into relay' }).click();

  expect(onSearchChange).toHaveBeenCalledWith({ ...at7d, gateway: 'relay' });
});

test('a scope with no traffic names its recovery and clears from it', async () => {
  installFakeBridge({ usageReport: servedReport });

  const onSearchChange = vi.fn<(next: UsageSearch) => void>();
  const screen = await mounted(
    <UsagePage onSearchChange={onSearchChange} search={{ ...at7d, gateway: 'quiet' }} />,
  );

  await expect
    .element(screen.getByText('Nothing served through this gateway in the last 7 days'))
    .toBeVisible();

  await screen.getByRole('button', { name: 'Clear scope' }).click();

  expect(onSearchChange).toHaveBeenCalledWith(at7d);
});

test('history loads as placeholders, never zeros', async () => {
  installFakeBridge({
    usageReport: servedReport,
    overrides: {
      'usage:report': async () => new Promise<never>(() => {}),
    },
  });

  const screen = await mounted(<UsagePage onSearchChange={() => {}} search={at7d} />);

  await expect.element(screen.getByRole('radio', { name: /Requests.*—/ })).toBeVisible();
  expect(screen.container.textContent).not.toContain('0 requests');
});

test('a refused history read names itself and moves the control to the live plane', async () => {
  installFakeBridge({
    usageReport: servedReport,
    overrides: {
      'usage:report': async () =>
        Promise.resolve({
          ok: false,
          error: { code: 'storage-failed', message: 'The stored usage history cannot be read.' },
        }),
    },
  });

  const onSearchChange = vi.fn<(next: UsageSearch) => void>();
  const screen = await mounted(<UsagePage onSearchChange={onSearchChange} search={at7d} />);

  await expect.element(screen.getByText('The stored usage history cannot be read.')).toBeVisible();
  await expect.element(screen.getByRole('button', { name: 'Retry' })).toBeVisible();
  expect(onSearchChange).toHaveBeenCalledWith({ range: '1h', metric: 'requests' });
});
