import type { LogRow } from '@recompose/contracts';
import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import type { UsageSearch } from '../../lib/usage-search';

import { engineLogsQueryOptions } from '../../../../shared/api';
import { gatewaySeed, installFakeBridge } from '../../../../shared/testing';
import { UsagePage } from './usage-page';

const A_CALLER_DIGEST = `sha256:${'a'.repeat(64)}`;

function liveRow(id: string, at: number): LogRow {
  return {
    id,
    at,
    gateway: 'relay',
    virtualModel: 'creative',
    origin: 'provider',
    method: 'POST',
    status: 200,
    durationMs: 400,
    clientKey: A_CALLER_DIGEST,
  };
}

function freshQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

async function mounted(ui: ReactNode, queryClient: QueryClient = freshQueryClient()) {
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const atLiveHour: UsageSearch = { range: '1h', metric: 'requests', stackedBy: 'gateway' };

test('the live hour stands its readings up before the first request arrives', async () => {
  installFakeBridge({
    gateways: [gatewaySeed({ slug: 'relay', displayName: 'Relay', port: 4310 })],
  });

  const screen = await mounted(<UsagePage onSearchChange={() => {}} search={atLiveHour} />);

  const readings = screen.getByRole('region', { name: 'Window readings' });

  await expect.element(readings.getByText('0', { exact: true }).first()).toBeVisible();
  await expect
    .element(screen.getByRole('heading', { level: 2, name: 'No requests yet' }))
    .not.toBeInTheDocument();
});

test('a refused gateway read reads as a refusal rather than as nothing served', async () => {
  installFakeBridge({
    overrides: {
      'gateways:list': async () =>
        Promise.resolve({
          ok: false,
          error: { code: 'storage-failed', message: 'The gateway list cannot be read.' },
        }),
    },
  });

  const screen = await mounted(<UsagePage onSearchChange={() => {}} search={atLiveHour} />);

  await expect.element(screen.getByText('The gateway list cannot be read.')).toBeVisible();
});

test('the live hour folds the rows the renderer already holds', async () => {
  installFakeBridge({
    gateways: [gatewaySeed({ slug: 'relay', displayName: 'Relay', port: 4310 })],
  });

  const queryClient = freshQueryClient();

  queryClient.setQueryData(engineLogsQueryOptions('relay').queryKey, [
    liveRow('earlier', Date.now() - 120_000),
    liveRow('later', Date.now() - 60_000),
  ]);

  const screen = await mounted(
    <UsagePage onSearchChange={() => {}} search={atLiveHour} />,
    queryClient,
  );

  const readings = screen.getByRole('region', { name: 'Window readings' });

  await expect.element(readings.getByText('2', { exact: true })).toBeVisible();
  await expect.element(screen.getByText(/minute buckets/).first()).toBeVisible();
});
