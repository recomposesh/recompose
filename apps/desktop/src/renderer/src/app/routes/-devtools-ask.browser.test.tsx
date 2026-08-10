import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { gatewaySeed, installFakeBridge } from '../../shared/testing';
import { createQueryClient } from '../query-client';
import { createAppRouter } from '../router';

vi.setConfig({ testTimeout: 40_000 });

const codex = gatewaySeed({ slug: 'codex', displayName: 'Codex', port: 51234 });

type DevtoolsAsk = (payload: 'asked') => void;

function devtoolsLine(): () => void {
  const listeners = new Set<DevtoolsAsk>();

  window.recomposeEvents = {
    ...window.recomposeEvents,
    'devtools:toggle': (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };

  return () => {
    for (const listener of listeners) {
      listener('asked');
    }
  };
}

async function renderUnderADevtoolsLine() {
  installFakeBridge({ gateways: [codex] });

  const pushToggle = devtoolsLine();
  const queryClient = createQueryClient();
  const router = createAppRouter({
    queryClient,
    history: createMemoryHistory({ initialEntries: ['/gateways/codex'] }),
  });

  const screen = await render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  return { screen, pushToggle };
}

async function repainted(): Promise<void> {
  await new Promise((settle) => {
    setTimeout(settle, 60);
  });
}

test('the devtools ask leaves the screen a person is on exactly as it stood', async () => {
  const { screen, pushToggle } = await renderUnderADevtoolsLine();

  await expect.element(screen.getByRole('toolbar', { name: 'Codex' })).toBeVisible();

  pushToggle();
  await repainted();

  await expect.element(screen.getByRole('toolbar', { name: 'Codex' })).toBeVisible();

  pushToggle();
  await repainted();

  await expect.element(screen.getByRole('toolbar', { name: 'Codex' })).toBeVisible();
});
