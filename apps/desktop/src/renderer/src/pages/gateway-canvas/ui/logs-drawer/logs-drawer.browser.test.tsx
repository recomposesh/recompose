import { beforeEach, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';

import { logsDrawerOpen, panelWidth } from '../../../../shared/lib';
import { drawerOn, freshDrawer, listed } from './logs-drawer.testkit';

beforeEach(freshDrawer);

test('the drawer titles itself with the gateway it streams and reads live while it serves', async () => {
  const screen = await drawerOn();

  await expect.element(screen.getByText('Logs · My Gateway')).toBeVisible();
  await expect.element(screen.getByText('Live', { exact: true })).toBeVisible();
});

test('a gateway that stopped reads stopped in the same place, with its rows still standing', async () => {
  const screen = await drawerOn({ serving: 'stopped' });

  await expect.element(screen.getByText('Stopped', { exact: true })).toBeVisible();
  expect(listed(screen.container)).toHaveLength(4);
});

test('the close control inside the drawer puts it away', async () => {
  const screen = await drawerOn();

  await userEvent.click(screen.getByRole('button', { name: 'Close logs' }));

  expect(logsDrawerOpen()).toBe(false);
});

test('the top edge sizes the drawer with the arrows of its own axis', async () => {
  const screen = await drawerOn();
  const stood = panelWidth('logs');

  screen.getByRole('separator', { name: 'Logs height' }).element().focus();
  await userEvent.keyboard('{ArrowUp}');

  expect(panelWidth('logs')).toBeGreaterThan(stood);
});

test('dragging the top edge past the collapse threshold shuts the drawer rather than slivering it', async () => {
  const screen = await drawerOn();

  screen.getByRole('separator', { name: 'Logs height' }).element().focus();
  await userEvent.keyboard('{Enter}');

  expect(logsDrawerOpen()).toBe(false);
});
