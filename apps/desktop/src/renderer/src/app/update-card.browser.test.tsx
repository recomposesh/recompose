import { expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';

import { emitUpdateState } from '../shared/testing';
import { renderAt } from './testing/render-app';

test('a landed download stands in the sidebar and survives navigation', async () => {
  const screen = await renderAt('/');

  await expect.element(screen.getByText('Get started')).toBeVisible();

  emitUpdateState({ standing: 'ready', version: '0.4.0' });

  await expect.element(screen.getByRole('region', { name: 'Update ready' })).toBeVisible();
  await expect.element(screen.getByText('0.3.0 → 0.4.0')).toBeVisible();

  await userEvent.click(screen.getByRole('link', { name: 'Usage' }));

  await expect.element(screen.getByRole('region', { name: 'Update ready' })).toBeVisible();
});

test('a window that opens after the download still reads the waiting version', async () => {
  const screen = await renderAt('/', {
    overrides: {
      'updates:get': async () =>
        Promise.resolve({ ok: true, value: { standing: 'ready', version: '0.4.0' } }),
    },
  });

  await expect.element(screen.getByRole('region', { name: 'Update ready' })).toBeVisible();
});
