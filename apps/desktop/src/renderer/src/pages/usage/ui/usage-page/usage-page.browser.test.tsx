import type { UsageBucket, UsageReport } from '@recompose/contracts';
import type { ReactNode } from 'react';

import { defaultSettings } from '@recompose/contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import type { UsageSearch } from '../../lib/usage-search';

import { edgeRuleDrawn, installFakeBridge } from '../../../../shared/testing';
import { UsagePage } from './usage-page';

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
const NOW_HOUR = Date.now() - (Date.now() % HOUR_MS);
const DAY_START = NOW_HOUR - (NOW_HOUR % DAY_MS);

function servedBucket(start: number, gateway: string, requests: number): UsageBucket {
  return {
    start,
    tuple: { gateway, virtualModel: 'creative', accountId: 'k1', providerModel: 'claude-sonnet-5' },
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

function freshQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

async function mounted(ui: ReactNode, queryClient: QueryClient = freshQueryClient()) {
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const at7d: UsageSearch = { range: '7d', metric: 'requests', stackedBy: 'gateway' };

test('before any traffic the grid stands, saying what it is waiting for', async () => {
  installFakeBridge({});

  const screen = await mounted(<UsagePage onSearchChange={() => {}} search={at7d} />);

  await expect.element(screen.getByText('No Requests Yet')).toBeVisible();
  await expect
    .element(screen.getByText('Send a request through a gateway and it collects here.'))
    .toBeVisible();
  await expect.element(screen.getByRole('region', { name: 'By target' })).toBeVisible();
  expect(screen.container.querySelector('table')).toBeNull();
});

test('a window that served nothing offers the one way out of it', async () => {
  installFakeBridge({ settings: { ...defaultSettings(), firstRequestServed: true } });

  const moved = vi.fn<(next: UsageSearch) => void>();
  const screen = await mounted(<UsagePage onSearchChange={moved} search={at7d} />);

  await expect.element(screen.getByText('No Requests')).toBeVisible();
  await expect.element(screen.getByText('Nothing served in the last 7 days.')).toBeVisible();

  await screen.getByRole('button', { name: 'Widen to 30 days' }).click();

  expect(moved).toHaveBeenCalledWith(expect.objectContaining({ range: '30d' }));
});

test('served history lands in the tiles, the chart, and all three panels together', async () => {
  installFakeBridge({ usageReport: servedReport });

  const screen = await mounted(<UsagePage onSearchChange={() => {}} search={at7d} />);

  const readings = screen.getByRole('region', { name: 'Window readings' });

  await expect.element(readings.getByText('12', { exact: true })).toBeVisible();
  await expect.element(screen.getByRole('region', { name: 'Requests over time' })).toBeVisible();
  await expect.element(screen.getByRole('region', { name: 'By gateway' })).toBeVisible();
  await expect.element(screen.getByRole('region', { name: 'By virtual model' })).toBeVisible();
  await expect.element(screen.getByRole('region', { name: 'By target' })).toBeVisible();
});

test('the header names the window and what the readings stand for', async () => {
  installFakeBridge({ usageReport: servedReport });

  const screen = await mounted(<UsagePage onSearchChange={() => {}} search={at7d} />);

  await expect.element(screen.getByRole('heading', { level: 1, name: 'Usage' })).toBeVisible();
  await expect
    .element(screen.getByText('All gateways · All providers · Last 7 days'))
    .toBeVisible();
});

test('a standing filter narrows every reading and the sentence says so', async () => {
  installFakeBridge({ usageReport: servedReport });

  const screen = await mounted(
    <UsagePage onSearchChange={() => {}} search={{ ...at7d, gateways: ['backup'] }} />,
  );

  const readings = screen.getByRole('region', { name: 'Window readings' });

  await expect.element(readings.getByText('3', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('backup · All providers · Last 7 days')).toBeVisible();
});

test('the chart marks where retained history begins when the window cut it', async () => {
  installFakeBridge({
    usageReport: { ...servedReport, oldestRetainedStart: NOW_HOUR - 2 * HOUR_MS },
  });

  const screen = await mounted(<UsagePage onSearchChange={() => {}} search={at7d} />);

  await expect.element(screen.getByRole('img', { name: /Requests/ })).toBeInTheDocument();
  await edgeRuleDrawn(screen.container);
});

test('selecting spend snaps a sub-day range onto day width', async () => {
  installFakeBridge({ usageReport: servedReport });

  const onSearchChange = vi.fn<(next: UsageSearch) => void>();
  const screen = await mounted(
    <UsagePage
      onSearchChange={onSearchChange}
      search={{ range: '24h', metric: 'requests', stackedBy: 'gateway' }}
    />,
  );

  await screen.getByRole('radio', { name: 'Spend' }).click();

  expect(onSearchChange).toHaveBeenCalledWith({
    range: '7d',
    metric: 'spend',
    stackedBy: 'gateway',
  });
});

test('picking a stack dimension moves the whole view onto it', async () => {
  installFakeBridge({ usageReport: servedReport });

  const onSearchChange = vi.fn<(next: UsageSearch) => void>();
  const screen = await mounted(<UsagePage onSearchChange={onSearchChange} search={at7d} />);

  await screen.getByRole('button', { name: 'Stacked by Gateway' }).click();
  await screen.getByRole('menuitem', { name: 'Virtual model' }).click();

  expect(onSearchChange).toHaveBeenCalledWith({ ...at7d, stackedBy: 'virtualModel' });
});

test('history loads as placeholders, never zeros', async () => {
  installFakeBridge({
    usageReport: servedReport,
    overrides: {
      'usage:report': async () => new Promise<never>(() => {}),
    },
  });

  const screen = await mounted(<UsagePage onSearchChange={() => {}} search={at7d} />);

  await expect
    .element(screen.getByRole('region', { name: 'Window readings' }).getByText('—').first())
    .toBeVisible();
  expect(screen.container.textContent).not.toContain('0 requests');
});

test('a refused history read names itself and offers the read again', async () => {
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

  const screen = await mounted(<UsagePage onSearchChange={() => {}} search={at7d} />);

  await expect.element(screen.getByText('The stored usage history cannot be read.')).toBeVisible();
  await expect.element(screen.getByRole('button', { name: 'Try again' })).toBeVisible();
});

test('a panel reprints in the unit its control names', async () => {
  installFakeBridge({ usageReport: servedReport });

  const screen = await mounted(<UsagePage onSearchChange={() => {}} search={at7d} />);
  const panel = screen.getByRole('region', { name: 'By gateway' });

  await expect.element(panel.getByText('9', { exact: true })).toBeVisible();

  await panel.getByRole('radio', { name: 'Tokens' }).click();

  await expect.element(panel.getByText('1.0k', { exact: true }).first()).toBeVisible();
  await expect.element(panel.getByText('9', { exact: true })).not.toBeInTheDocument();
});

test('the header refresh asks the ledger for the window again', async () => {
  const asks: number[] = [];

  installFakeBridge({
    usageReport: servedReport,
    overrides: {
      'usage:report': async () => {
        asks.push(asks.length);

        return Promise.resolve({ ok: true, value: servedReport });
      },
    },
  });

  const screen = await mounted(<UsagePage onSearchChange={() => {}} search={at7d} />);

  await vi.waitFor(() => {
    expect(asks.length).toBeGreaterThan(0);
  });

  const before = asks.length;

  await screen.getByRole('button', { name: 'Refresh', exact: true }).click();

  await vi.waitFor(() => {
    expect(asks.length).toBeGreaterThan(before);
  });
});

test('the retry beside a refused read asks for the window again', async () => {
  const asks: number[] = [];

  installFakeBridge({
    usageReport: servedReport,
    overrides: {
      'usage:report': async () => {
        asks.push(asks.length);

        return Promise.resolve({
          ok: false,
          error: { code: 'storage-failed', message: 'The stored usage history cannot be read.' },
        });
      },
    },
  });

  const screen = await mounted(<UsagePage onSearchChange={() => {}} search={at7d} />);

  await expect.element(screen.getByRole('button', { name: 'Try again' })).toBeVisible();

  const before = asks.length;

  await screen.getByRole('button', { name: 'Try again' }).click();

  await vi.waitFor(() => {
    expect(asks.length).toBeGreaterThan(before);
  });
});
