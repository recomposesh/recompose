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

test('a gateway subject offers deletion alone, because the toolbar already carries the guide', async () => {
  closeConnectSheet();

  const screen = await renderDrawer({ kind: 'gateway' });

  await expect
    .element(screen.getByRole('button', { name: 'See instructions' }))
    .not.toBeInTheDocument();
  await expect.element(screen.getByRole('button', { name: 'Delete gateway' })).toBeVisible();
});
