import type { UpdateState } from '@recompose/contracts';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense } from 'react';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';

import { systemQueryOptions, updatesQueryOptions } from '../../../../shared/api';
import { installFakeBridge } from '../../../../shared/testing';
import { AppUpdateCard } from './app-update-card';

async function renderCard(standing: UpdateState) {
  installFakeBridge({
    overrides: {
      'updates:get': async () => Promise.resolve({ ok: true, value: standing }),
    },
  });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  await Promise.all([
    queryClient.ensureQueryData(updatesQueryOptions),
    queryClient.ensureQueryData(systemQueryOptions),
  ]);

  return render(
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<p>Loading…</p>}>
        <AppUpdateCard />
      </Suspense>
    </QueryClientProvider>,
  );
}

test('a ready version names both versions and offers one restart', async () => {
  const screen = await renderCard({ standing: 'ready', version: '0.4.0' });

  await expect.element(screen.getByRole('region', { name: 'Update ready' })).toBeVisible();
  await expect.element(screen.getByText('0.3.0 → 0.4.0')).toBeVisible();
  await expect.element(screen.getByRole('button', { name: 'Restart to update' })).toBeVisible();
});

test('a quiet channel renders no card', async () => {
  const screen = await renderCard({ standing: 'quiet' });

  await vi.waitFor(() => {
    expect(screen.container.textContent).toBe('');
  });
});

test('a version still downloading renders no card', async () => {
  const screen = await renderCard({ standing: 'downloading', version: '0.4.0' });

  await vi.waitFor(() => {
    expect(screen.container.textContent).toBe('');
  });
});

test('a check the person asked for reports itself while nothing waits to install', async () => {
  const screen = await renderCard({ standing: 'quiet', check: { standing: 'asking' } });

  await expect.element(screen.getByRole('region', { name: 'Update check' })).toBeVisible();
  await expect.element(screen.getByText('Checking for updates…')).toBeVisible();
});

test('dismissing a settled check leaves the sidebar quiet again', async () => {
  const screen = await renderCard({ standing: 'quiet', check: { standing: 'current' } });

  await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

  await vi.waitFor(() => {
    expect(screen.container.textContent).toBe('');
  });
});

test('a downloaded version outranks its own check report, so one card stands', async () => {
  const screen = await renderCard({
    standing: 'ready',
    version: '0.4.0',
    check: { standing: 'found', version: '0.4.0' },
  });

  await expect.element(screen.getByRole('region', { name: 'Update ready' })).toBeVisible();
  expect(screen.container.textContent).not.toContain('Update found');
});
