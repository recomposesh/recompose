import { expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';

import { closeConnectSheet, connectSheetOpen } from '../../../../shared/lib';
import { renderDrawer } from '../../testing/gateway-drawer.testkit';

test('a virtual model offers the way to reach it before the way to delete it', async () => {
  closeConnectSheet();

  const screen = await renderDrawer({ kind: 'virtual-model', modelId: 'fast' });

  await userEvent.click(screen.getByRole('button', { name: 'See instructions' }));

  expect(connectSheetOpen()).toBe(true);

  closeConnectSheet();
});

test('a gateway offers the same way in, standing over its own deletion', async () => {
  closeConnectSheet();

  const screen = await renderDrawer({ kind: 'gateway' });

  await expect.element(screen.getByRole('button', { name: 'Delete gateway' })).toBeVisible();

  await userEvent.click(screen.getByRole('button', { name: 'See instructions' }));

  expect(connectSheetOpen()).toBe(true);

  closeConnectSheet();
});
