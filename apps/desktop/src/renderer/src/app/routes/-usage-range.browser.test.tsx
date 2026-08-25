import { defaultSettings } from '@recompose/contracts';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';

import type { BridgeParameters } from '../../shared/testing';

import { installFakeBridge, servedReport } from '../../shared/testing';
import { createQueryClient } from '../query-client';
import { createAppRouter } from '../router';

function mountedAt(path: string, parameters: BridgeParameters = {}) {
  installFakeBridge(parameters);

  const queryClient = createQueryClient();
  const router = createAppRouter({
    queryClient,
    history: createMemoryHistory({ initialEntries: [path] }),
  });

  void render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  return { router };
}

test('the usage surface carries the range control in the toolbar', async () => {
  const { router } = mountedAt('/usage?range=7d');

  await expect.element(page.getByRole('radiogroup', { name: 'Range' })).toBeInTheDocument();
  await expect.element(page.getByRole('radio', { name: '7d' })).toBeChecked();

  await page.getByRole('radio', { name: '24h' }).click();

  await vi.waitFor(() => {
    expect(router.state.location.search).toMatchObject({ range: '24h' });
  });
});

test('a range past retention stands inert with the window named', async () => {
  mountedAt('/usage?range=7d', {
    settings: { ...defaultSettings(), setupWizardSettled: true, usageRetentionDays: 7 },
  });

  const month = page.getByRole('radio', { name: /30d/ });

  await expect.element(month).toHaveAttribute('aria-disabled', 'true');
  await expect.element(month).toHaveAccessibleDescription('Usage retention holds 7 days');
});

test('other surfaces carry no range control', async () => {
  mountedAt('/providers');

  await expect.element(page.getByRole('main')).toBeInTheDocument();
  expect(document.querySelector('[aria-label="Range"]')).toBeNull();
});

test('picking a gateway in the toolbar filter moves the address', async () => {
  const { router } = mountedAt('/usage?range=7d', { usageReport: servedReport });

  await page.getByRole('button', { name: /Gateways/ }).click();
  await page.getByRole('checkbox', { name: 'relay' }).click();

  await vi.waitFor(() => {
    expect(router.state.location.search).toMatchObject({ gateways: ['relay'] });
  });
});
