import { expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import { renderDrawer } from '../../testing/gateway-drawer.testkit';

vi.setConfig({ testTimeout: 40_000 });

async function storedPort(): Promise<number | undefined> {
  const listed = await window.recompose['gateways:list']();

  return listed.ok ? listed.value[0]?.port : undefined;
}

test('the endpoint carries the port as a field a person reads and edits', async () => {
  const screen = await renderDrawer({ kind: 'gateway' });

  await expect.element(screen.getByRole('textbox', { name: 'Port' })).toHaveValue('8397');
});

test('settling a new port on a resting gateway stores it with no question', async () => {
  const screen = await renderDrawer({ kind: 'gateway' }, { states: {} });
  const field = screen.getByRole('textbox', { name: 'Port' });

  await field.fill('8500');
  await userEvent.keyboard('{Enter}');

  await expect.element(screen.getByText(/Move the gateway/)).not.toBeInTheDocument();
  await expect.poll(async () => storedPort()).toBe(8500);
});

test('settling a new port on a serving gateway asks, and Restart moves it', async () => {
  const screen = await renderDrawer({ kind: 'gateway' });

  await expect.element(screen.getByText('Running')).toBeVisible();

  const field = screen.getByRole('textbox', { name: 'Port' });

  await field.fill('8500');
  await userEvent.keyboard('{Enter}');

  await expect.element(screen.getByText(/Move the gateway to port 8500\?/)).toBeVisible();

  await userEvent.click(screen.getByRole('button', { name: 'Restart' }));

  await expect.poll(async () => storedPort()).toBe(8500);
});

test('Cancel on the restart question keeps the served port exactly as it stood', async () => {
  const screen = await renderDrawer({ kind: 'gateway' });
  const field = screen.getByRole('textbox', { name: 'Port' });

  await field.fill('8500');
  await userEvent.keyboard('{Enter}');
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

  await expect.element(screen.getByText(/Move the gateway/)).not.toBeInTheDocument();
  await expect.element(screen.getByRole('textbox', { name: 'Port' })).toHaveValue('8397');
  expect(await storedPort()).toBe(8397);
});

test('a port outside the range settles back to the stored one instead of asking', async () => {
  const screen = await renderDrawer({ kind: 'gateway' });
  const field = screen.getByRole('textbox', { name: 'Port' });

  await field.fill('80');
  await userEvent.keyboard('{Enter}');

  await expect.element(screen.getByText(/Move the gateway/)).not.toBeInTheDocument();
  await expect.element(field).toHaveValue('8397');
});
