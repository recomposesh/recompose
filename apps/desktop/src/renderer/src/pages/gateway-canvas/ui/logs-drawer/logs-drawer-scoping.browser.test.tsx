import { beforeEach, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import {
  cursorRefIn,
  drawerOn,
  focusTheList,
  freshDrawer,
  listed,
  narrowedToErrors,
  narrowedToSuccess,
  widenedToAll,
} from '../../testing/logs-drawer.testkit';

beforeEach(freshDrawer);

test('the header offers only the mutually exclusive All, Success, and Errors filters', async () => {
  const screen = await drawerOn();
  const labels = [...screen.container.querySelectorAll('[role="radio"]')].map((radio) =>
    radio.textContent.trim(),
  );
  const success = screen.getByRole('radio', { name: 'Success' }).element();
  const errors = screen.getByRole('radio', { name: 'Errors' }).element();

  expect(labels).toEqual(['All', 'Success', 'Errors']);
  await expect
    .element(screen.getByRole('radio', { name: 'All' }))
    .toHaveAttribute('aria-checked', 'true');
  expect(success.classList.contains('text-running-ink')).toBe(true);
  expect(errors.classList.contains('text-danger-ink')).toBe(true);
  expect(screen.container.querySelector('[aria-label="More log scopes"]')).toBeNull();

  await narrowedToSuccess(screen);

  await expect
    .element(screen.getByRole('radio', { name: 'Success' }))
    .toHaveAttribute('aria-checked', 'true');
  expect(success.classList.contains('text-running-ink')).toBe(true);

  await narrowedToErrors(screen);

  await expect
    .element(screen.getByRole('radio', { name: 'Errors' }))
    .toHaveAttribute('aria-checked', 'true');
  expect(errors.classList.contains('text-danger-ink')).toBe(true);
});

test('a selected virtual model names and types the header and leaves only its requests standing', async () => {
  const screen = await drawerOn({ subject: { kind: 'virtual-model', modelId: 'creative' } });

  await expect.element(screen.getByText('Logs for Creative')).toBeVisible();
  await expect.element(screen.getByText('Virtual Model', { exact: true })).toBeVisible();
  expect(listed(screen.container)).toHaveLength(2);
  expect(listed(screen.container).join(' ')).not.toContain('fast');
});

test('a virtual model missing from the gateway falls back to its id', async () => {
  const screen = await drawerOn({ subject: { kind: 'virtual-model', modelId: 'missing-model' } });

  await expect.element(screen.getByText('Logs for missing-model')).toBeVisible();
});

test('the cable that binds a virtual model reads as that named binding', async () => {
  const screen = await drawerOn({ subject: { kind: 'cable', modelId: 'fast' } });

  await expect.element(screen.getByText('Logs for Fast')).toBeVisible();
  await expect.element(screen.getByText('Binding', { exact: true })).toBeVisible();
  expect(listed(screen.container)).toHaveLength(2);
  expect(listed(screen.container).join(' ')).not.toContain('creative');
});

test('a selected target reads the account name and target type', async () => {
  const screen = await drawerOn({
    subject: { kind: 'target', accountId: 'g1', modelId: 'creative' },
  });

  await expect.element(screen.getByText('Logs for openrouter')).toBeVisible();
  await expect.element(screen.getByText('Target', { exact: true })).toBeVisible();
  expect(listed(screen.container)).toHaveLength(2);
  expect(listed(screen.container).join(' ')).not.toContain('anthropic');
});

test('a target missing from the registry falls back to its id', async () => {
  const screen = await drawerOn({
    accounts: [],
    subject: { kind: 'target', accountId: 'missing-account', modelId: 'ghosted' },
  });

  await expect.element(screen.getByText('Logs for missing-account')).toBeVisible();
});

test('a target since removed keeps its available name and reads as a removed target', async () => {
  const screen = await drawerOn({
    subject: { kind: 'ghost-target', accountId: 'g1', modelId: 'creative' },
  });

  await expect.element(screen.getByText('Logs for openrouter')).toBeVisible();
  await expect.element(screen.getByText('Removed Provider', { exact: true })).toBeVisible();
});

test('a draft names the new virtual model and narrows nothing', async () => {
  const screen = await drawerOn({ subject: { kind: 'draft' } });

  await expect.element(screen.getByText('Logs for New virtual model')).toBeVisible();
  await expect.element(screen.getByText('Draft', { exact: true })).toBeVisible();
  expect(listed(screen.container)).toHaveLength(4);
});

test('the Errors segment only ever takes successful requests away', async () => {
  const screen = await drawerOn();

  await narrowedToErrors(screen);

  await expect
    .element(screen.getByRole('radio', { name: 'Errors' }))
    .toHaveAttribute('aria-checked', 'true');
  expect(listed(screen.container)).toHaveLength(2);
  expect(listed(screen.container).join(' ')).not.toContain('200');
});

test('an empty Errors filter says there are no errors rather than no requests', async () => {
  const screen = await drawerOn({ rows: [] });

  await narrowedToErrors(screen);

  await expect.element(screen.getByText('No errors from any client yet.')).toBeVisible();
  await expect
    .element(screen.getByText('No requests from any client app yet.'))
    .not.toBeInTheDocument();
});

test('the Success segment leaves only non-failing requests in the selected subject', async () => {
  const screen = await drawerOn({ subject: { kind: 'virtual-model', modelId: 'fast' } });

  await narrowedToSuccess(screen);

  expect(listed(screen.container)).toHaveLength(1);
  expect(listed(screen.container).join(' ')).toContain('200');
  expect(listed(screen.container).join(' ')).not.toContain('500');
});

test('the Errors segment composes with whatever subject stands', async () => {
  const screen = await drawerOn({ subject: { kind: 'virtual-model', modelId: 'fast' } });

  await narrowedToErrors(screen);

  expect(listed(screen.container)).toHaveLength(1);
  expect(listed(screen.container).join(' ')).toContain('500');
});

test('the All segment restores successful requests in the selected subject', async () => {
  const screen = await drawerOn({ subject: { kind: 'virtual-model', modelId: 'fast' } });

  await narrowedToErrors(screen);
  await widenedToAll(screen);

  expect(listed(screen.container)).toHaveLength(2);
  await expect
    .element(screen.getByRole('radio', { name: 'All' }))
    .toHaveAttribute('aria-checked', 'true');
});

test('a subject holding no requests says which subject came up empty', async () => {
  const screen = await drawerOn({ rows: [], subject: { kind: 'virtual-model', modelId: 'fast' } });

  await expect
    .element(screen.getByText('No requests through this virtual model yet.'))
    .toBeVisible();
});

test('a removed target with no requests behind it says so in its own words', async () => {
  const screen = await drawerOn({
    rows: [],
    subject: { kind: 'ghost-target', accountId: 'g1', modelId: 'creative' },
  });

  await expect
    .element(screen.getByText('No requests reached the removed target yet.'))
    .toBeVisible();
});

test('changing the filter announces nothing, because no request arrived', async () => {
  const screen = await drawerOn();

  await narrowedToErrors(screen);
  await widenedToAll(screen);

  expect(screen.getByRole('status').element().textContent).toBe('');
});

test('the cursor stays on the request a person chose when the filter widens under it', async () => {
  const screen = await drawerOn();

  await narrowedToErrors(screen);
  focusTheList(screen);
  await userEvent.keyboard('{ArrowDown}');
  expect(cursorRefIn(screen)).toMatch(/-c$/);

  await widenedToAll(screen);

  expect(listed(screen.container)).toHaveLength(4);
  expect(cursorRefIn(screen)).toMatch(/-c$/);
});

test('a filter that drops the row under the cursor copies nothing rather than another row', async () => {
  const written = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
  const screen = await drawerOn();

  focusTheList(screen);
  await userEvent.keyboard('{ArrowDown}');
  expect(cursorRefIn(screen)).toMatch(/-a$/);

  await narrowedToErrors(screen);
  focusTheList(screen);
  await userEvent.keyboard('{Meta>}c{/Meta}');

  expect(written).not.toHaveBeenCalled();
});
