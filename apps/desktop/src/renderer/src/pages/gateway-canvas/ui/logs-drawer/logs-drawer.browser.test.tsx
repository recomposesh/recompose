import { beforeEach, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';

import { logsDrawerOpen, panelWidth } from '../../../../shared/lib';
import {
  drawerOn,
  focusTheList,
  freshDrawer,
  listed,
  narrowedToErrors,
} from '../../testing/logs-drawer.testkit';

beforeEach(freshDrawer);

test('the drawer titles itself with the gateway it streams and reads live while it serves', async () => {
  const screen = await drawerOn();

  await expect.element(screen.getByText('Logs for My Gateway')).toBeVisible();
  await expect.element(screen.getByText('Gateway', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('Live', { exact: true })).toBeVisible();
});

test('the drawer exposes its animation hook and switches to the leaving class on exit', async () => {
  const screen = await drawerOn({ leaving: true });
  const drawer = screen.container.querySelector('[data-logs-drawer]');

  expect(drawer).not.toBeNull();
  expect(drawer?.classList.contains('logs-drawer-leaving')).toBe(true);
  expect(drawer?.classList.contains('logs-drawer')).toBe(false);
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

/** The reading beside the run, whichever request the cursor came to rest on. */
function theJourney(screen: Awaited<ReturnType<typeof drawerOn>>) {
  return screen.getByRole('complementary', { name: 'Request detail' });
}

test('the run says nothing beside it until a person walks onto a request', async () => {
  const screen = await drawerOn();

  await expect
    .element(theJourney(screen))
    .toHaveTextContent('Select a request to read what it came to.');
});

test('walking the run onto a request reads that request in full beside it', async () => {
  const screen = await drawerOn();

  focusTheList(screen);
  await userEvent.keyboard('{ArrowDown}');

  await expect.element(theJourney(screen)).toHaveTextContent('Asked for');
  await expect.element(theJourney(screen)).toHaveTextContent('claude-haiku-4-5');
});

test('the reading stands inside the drawer, so nothing it opens covers the canvas', async () => {
  const screen = await drawerOn();
  const inside = screen.container.querySelector('[data-logs-drawer] [data-request-journey]');

  expect(inside).not.toBeNull();
});

test('a narrowing that takes the read request away leaves nothing read', async () => {
  const screen = await drawerOn();

  focusTheList(screen);
  await userEvent.keyboard('{ArrowDown}');
  await expect.element(theJourney(screen)).toHaveTextContent('claude-haiku-4-5');

  await narrowedToErrors(screen);

  await expect
    .element(theJourney(screen))
    .toHaveTextContent('Select a request to read what it came to.');
});
