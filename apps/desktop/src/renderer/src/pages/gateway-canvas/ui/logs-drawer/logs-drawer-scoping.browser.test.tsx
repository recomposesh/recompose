import { beforeEach, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import { crowdedGateway } from '../../testing/gateway-canvas.testkit';
import {
  cursorRefIn,
  drawerOn,
  focusTheList,
  freshDrawer,
  listed,
  narrowedToErrors,
} from './logs-drawer.testkit';

beforeEach(freshDrawer);

test('the scope strip offers the whole gateway and one segment per virtual model', async () => {
  const screen = await drawerOn();

  await expect
    .element(screen.getByRole('radio', { name: 'All' }))
    .toHaveAttribute('aria-checked', 'true');
  await expect.element(screen.getByRole('radio', { name: 'Fast' })).toBeVisible();
  await expect.element(screen.getByRole('radio', { name: 'Creative' })).toBeVisible();
});

test('a selected virtual model lights its own segment and leaves only its requests standing', async () => {
  const screen = await drawerOn({ subject: { kind: 'virtual-model', modelId: 'creative' } });

  await expect
    .element(screen.getByRole('radio', { name: 'Creative' }))
    .toHaveAttribute('aria-checked', 'true');
  expect(listed(screen.container)).toHaveLength(2);
  expect(listed(screen.container).join(' ')).not.toContain('fast');
});

test('the cable that binds a virtual model scopes the rows to that same model', async () => {
  const screen = await drawerOn({ subject: { kind: 'cable', modelId: 'fast' } });

  await expect
    .element(screen.getByRole('radio', { name: 'Fast' }))
    .toHaveAttribute('aria-checked', 'true');
  expect(listed(screen.container)).toHaveLength(2);
  expect(listed(screen.container).join(' ')).not.toContain('creative');
});

test('a selected target stands a segment of its own carrying the name of that target', async () => {
  const screen = await drawerOn({ subject: { kind: 'target', accountId: 'g1' } });

  await expect
    .element(screen.getByRole('radio', { name: 'openrouter' }))
    .toHaveAttribute('aria-checked', 'true');
  expect(listed(screen.container)).toHaveLength(2);
  expect(listed(screen.container).join(' ')).not.toContain('anthropic');
});

test('a target since removed stands a segment saying so rather than naming what is gone', async () => {
  const screen = await drawerOn({ subject: { kind: 'ghost-target', accountId: 'g1' } });

  await expect
    .element(screen.getByRole('radio', { name: 'Removed' }))
    .toHaveAttribute('aria-checked', 'true');
});

test('a draft in flight narrows nothing, so the whole gateway keeps reading', async () => {
  const screen = await drawerOn({ subject: { kind: 'draft' } });

  await expect
    .element(screen.getByRole('radio', { name: 'All' }))
    .toHaveAttribute('aria-checked', 'true');
  expect(listed(screen.container)).toHaveLength(4);
});

test('pressing a virtual model segment asks the canvas to select that model', async () => {
  const asked = vi.fn<(nodeId: string | undefined) => void>();
  const screen = await drawerOn({ onSelectSubject: asked });

  await userEvent.click(screen.getByRole('radio', { name: 'Creative' }));

  expect(asked).toHaveBeenCalledWith('model:creative');
});

test('pressing the whole-gateway segment clears the canvas selection instead of selecting it', async () => {
  const asked = vi.fn<(nodeId: string | undefined) => void>();
  const screen = await drawerOn({
    onSelectSubject: asked,
    subject: { kind: 'virtual-model', modelId: 'fast' },
  });

  await userEvent.click(screen.getByRole('radio', { name: 'All' }));

  expect(asked).toHaveBeenCalledWith(undefined);
});

test('the errors narrowing stands apart from the scope and only ever takes requests away', async () => {
  const screen = await drawerOn();

  await narrowedToErrors(screen);

  expect(listed(screen.container)).toHaveLength(2);
  expect(listed(screen.container).join(' ')).not.toContain('200');
});

test('the errors narrowing composes with whatever scope stands', async () => {
  const screen = await drawerOn({ subject: { kind: 'virtual-model', modelId: 'fast' } });

  await narrowedToErrors(screen);

  expect(listed(screen.container)).toHaveLength(1);
  expect(listed(screen.container).join(' ')).toContain('500');
});

test('a scope holding no requests says which scope came up empty', async () => {
  const screen = await drawerOn({ rows: [], subject: { kind: 'virtual-model', modelId: 'fast' } });

  await expect
    .element(screen.getByText('No requests through this virtual model yet.'))
    .toBeVisible();
});

test('a removed target with no requests behind it says so in its own words', async () => {
  const screen = await drawerOn({ rows: [], subject: { kind: 'ghost-target', accountId: 'g1' } });

  await expect
    .element(screen.getByText('No requests reached the removed target yet.'))
    .toBeVisible();
});

test('more virtual models than the header holds go behind the overflow control', async () => {
  const screen = await drawerOn({ gateway: crowdedGateway, rows: [] });

  await expect.element(screen.getByRole('radio', { name: 'one' })).toBeVisible();
  expect(screen.container.querySelectorAll('[role="radio"]')).toHaveLength(5);
  await expect.element(screen.getByRole('button', { name: 'More log scopes' })).toBeVisible();
});

test('a scope the header pushed into the overflow still stands lit while it holds', async () => {
  const screen = await drawerOn({
    gateway: crowdedGateway,
    rows: [],
    subject: { kind: 'virtual-model', modelId: 'six' },
  });

  await expect
    .element(screen.getByRole('radio', { name: 'six' }))
    .toHaveAttribute('aria-checked', 'true');
});

test('changing the narrowing announces nothing, because no request arrived', async () => {
  const screen = await drawerOn();

  await narrowedToErrors(screen);
  await narrowedToErrors(screen);

  expect(screen.getByRole('status').element().textContent).toBe('');
});

test('the cursor stays on the request a person chose when the scope widens under it', async () => {
  const screen = await drawerOn();

  await narrowedToErrors(screen);
  focusTheList(screen);
  await userEvent.keyboard('{ArrowDown}');
  expect(cursorRefIn(screen)).toMatch(/-c$/);

  await narrowedToErrors(screen);

  expect(listed(screen.container)).toHaveLength(4);
  expect(cursorRefIn(screen)).toMatch(/-c$/);
});

test('a narrowing that drops the row under the cursor copies nothing rather than another row', async () => {
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
