import { beforeEach, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';

import { renderAt } from '../testing/render-app';

beforeEach(() => {
  localStorage.clear();
});

test('an arrow walking onto Settings opens it, because moving the selection is what it asked', async () => {
  const screen = await renderAt('/usage');
  const usage = screen.getByRole('link', { name: 'Usage' });

  await expect.element(usage).toBeVisible();
  usage.element().focus();
  await userEvent.keyboard('{ArrowDown}');

  await expect.element(screen.getByRole('link', { name: 'Settings' })).toHaveFocus();
  await expect.element(screen.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
});

test('an arrow walking back onto Usage opens it the same way', async () => {
  const screen = await renderAt('/settings');
  const settings = screen.getByRole('link', { name: 'Settings' });

  await expect.element(settings).toBeVisible();
  settings.element().focus();
  await userEvent.keyboard('{ArrowUp}');

  await expect.element(screen.getByRole('link', { name: 'Usage' })).toHaveFocus();
  await expect.element(screen.getByRole('heading', { name: 'Usage', level: 1 })).toBeVisible();
});

test('an arrow walking onto a provider kind opens that kind of the providers surface', async () => {
  const screen = await renderAt('/');
  const subscriptions = screen.getByRole('link', { name: 'Subscriptions, 0 connected' });

  await expect.element(subscriptions).toBeVisible();
  subscriptions.element().focus();
  await userEvent.keyboard('{ArrowDown}');

  await expect
    .element(screen.getByRole('link', { name: 'API Keys, 0 connected' }))
    .toHaveAttribute('aria-current', 'page');
  await expect.element(screen.getByRole('button', { name: 'Add provider' })).toBeVisible();
});

test('an arrow landing on the kind already shown re-navigates nothing', async () => {
  const screen = await renderAt('/providers?kind=api-key');
  const subscriptions = screen.getByRole('link', { name: 'Subscriptions, 0 connected' });
  const apiKeys = screen.getByRole('link', { name: 'API Keys, 0 connected' });

  await expect.element(apiKeys).toHaveAttribute('aria-current', 'page');
  subscriptions.element().focus();
  await userEvent.keyboard('{ArrowDown}');

  await expect.element(apiKeys).toHaveFocus();
  await expect.element(apiKeys).toHaveAttribute('aria-current', 'page');
});

test('focus landing without an arrow asks for nothing, so nothing opens', async () => {
  const screen = await renderAt('/usage');
  const settings = screen.getByRole('link', { name: 'Settings' });

  await expect.element(settings).toBeVisible();
  settings.element().focus();

  await expect.element(screen.getByRole('heading', { name: 'Usage', level: 1 })).toBeVisible();
  await expect
    .element(screen.getByRole('heading', { name: 'Settings', level: 1 }))
    .not.toBeInTheDocument();
});
