import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';

import { installFakeBridge } from '../../../../shared/testing';
import { ReadyToRestart } from './ready-to-restart';

async function renderReadyToRestart(restarted = vi.fn<() => void>()) {
  installFakeBridge({
    overrides: {
      'updates:restart': async () => {
        restarted();

        return Promise.resolve({ ok: true, value: undefined });
      },
    },
  });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={queryClient}>
      <ReadyToRestart from="1.2.0" to="1.3.0" />
    </QueryClientProvider>,
  );
}

test('the card names the version being left and the one arriving, in that order', async () => {
  const screen = await renderReadyToRestart();

  await expect.element(screen.getByRole('region', { name: 'Update ready' })).toBeVisible();
  await expect.element(screen.getByText('1.2.0 → 1.3.0')).toBeVisible();
  await expect.element(screen.getByRole('button', { name: 'Restart to update' })).toBeVisible();
});

test('choosing the restart asks main exactly once', async () => {
  const restarted = vi.fn<() => void>();
  const screen = await renderReadyToRestart(restarted);

  await userEvent.click(screen.getByRole('button', { name: 'Restart to update' }));

  await vi.waitFor(() => {
    expect(restarted).toHaveBeenCalledTimes(1);
  });
});
