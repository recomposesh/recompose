import type { UpdateCheck } from '@recompose/contracts';

import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';

import { UpdateCheckNotice } from './update-check-notice';

async function renderNotice(check: UpdateCheck, onDismiss = vi.fn<() => void>()) {
  return render(<UpdateCheckNotice check={check} onDismiss={onDismiss} version="0.3.0" />);
}

test('a check still asking says so, and offers nothing to dismiss yet', async () => {
  const screen = await renderNotice({ standing: 'asking' });

  await expect.element(screen.getByRole('region', { name: 'Update check' })).toBeVisible();
  await expect.element(screen.getByText('Checking for updates…')).toBeVisible();
  expect(screen.container.querySelector('button')).toBeNull();
});

test('a copy already on the newest version names the version it runs', async () => {
  const screen = await renderNotice({ standing: 'current' });

  await expect.element(screen.getByText('Up to date')).toBeVisible();
  await expect.element(screen.getByText('Recompose 0.3.0 is the newest version.')).toBeVisible();
});

test('a newer version found names it and says it is on its way', async () => {
  const screen = await renderNotice({ standing: 'found', version: '0.4.0' });

  await expect.element(screen.getByText('Update found')).toBeVisible();
  await expect.element(screen.getByText('Recompose 0.4.0 is downloading.')).toBeVisible();
});

test('a refused check carries the reason the feed gave', async () => {
  const screen = await renderNotice({ standing: 'failed', reason: 'the release feed refused' });

  await expect.element(screen.getByText('Update check failed')).toBeVisible();
  await expect.element(screen.getByText('the release feed refused')).toBeVisible();
});

test('dismissing a settled check says so once', async () => {
  const dismissed = vi.fn<() => void>();
  const screen = await renderNotice({ standing: 'current' }, dismissed);

  await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

  expect(dismissed).toHaveBeenCalledTimes(1);
});
