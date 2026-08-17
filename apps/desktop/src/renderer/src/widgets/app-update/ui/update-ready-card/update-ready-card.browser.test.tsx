import type { UpdateState } from '@recompose/contracts';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense } from 'react';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';

import { systemQueryOptions, updatesQueryOptions } from '../../../../shared/api';
import { installFakeBridge } from '../../../../shared/testing';
import { UpdateReadyCard } from './update-ready-card';

async function renderCard(standing: UpdateState, restarted = vi.fn()) {
  installFakeBridge({
    overrides: {
      'updates:get': async () => Promise.resolve({ ok: true, value: standing }),
      'updates:restart': async () => {
        restarted();

        return Promise.resolve({ ok: true, value: undefined });
      },
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
        <UpdateReadyCard />
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

test('choosing the restart asks main exactly once', async () => {
  const restarted = vi.fn();
  const screen = await renderCard({ standing: 'ready', version: '0.4.0' }, restarted);

  await userEvent.click(screen.getByRole('button', { name: 'Restart to update' }));

  await vi.waitFor(() => {
    expect(restarted).toHaveBeenCalledTimes(1);
  });
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
