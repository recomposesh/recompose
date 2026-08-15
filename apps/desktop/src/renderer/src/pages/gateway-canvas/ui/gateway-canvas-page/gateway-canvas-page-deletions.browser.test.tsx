import { beforeEach, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import { toggleInspector } from '../../../../shared/lib';
import { gatewaySeed } from '../../../../shared/testing';
import {
  clickedCable,
  draftCardOn,
  storedBindingOf,
  storedModels,
} from '../../testing/canvas-gestures.testkit';
import {
  canvasPageOn,
  freshCanvasRun,
  renderCanvasPage,
  standCanvasBridge,
} from '../../testing/canvas-page.testkit';

vi.setConfig({ testTimeout: 40_000 });

beforeEach(freshCanvasRun);

test('Delete unbinds a selected cable without confirmation, into a draft that keeps the name', async () => {
  const screen = await canvasPageOn();

  await clickedCable(screen.container, 'cable:fast');
  await userEvent.keyboard('{Delete}');

  await expect.poll(async () => storedBindingOf('fast')).toBeUndefined();
  await expect.poll(() => draftCardOn(screen.container)?.textContent).toContain('Fast');
});

test('Delete on a selected virtual model node asks first, and cancel keeps it', async () => {
  const screen = await canvasPageOn();

  await userEvent.click(screen.getByRole('button', { name: /Fast/ }));
  await userEvent.keyboard('{Delete}');

  await expect.element(screen.getByText(/Delete the virtual model/)).toBeVisible();
  expect(await storedBindingOf('fast')).toBeDefined();

  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

  await expect.element(screen.getByText(/Delete the virtual model/)).not.toBeInTheDocument();
  expect(await storedBindingOf('fast')).toBeDefined();
});

test('confirming the removal takes the definition out of the gateway', async () => {
  const screen = await canvasPageOn();

  await userEvent.click(screen.getByRole('button', { name: /Fast/ }));
  await userEvent.keyboard('{Delete}');
  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: 'Delete' }));

  await expect.poll(async () => storedBindingOf('fast')).toBeUndefined();
  expect(draftCardOn(screen.container)).toBeNull();
  await expect.element(screen.getByRole('complementary')).not.toBeInTheDocument();
});

test('Delete never fires from a text field, so editing a name removes nothing', async () => {
  const screen = await canvasPageOn();

  screen.getByLabelText('Add a virtual model').element().focus();
  await userEvent.keyboard('{Enter}');

  const name = screen.getByRole('textbox', { name: 'Name' });

  await name.fill('Steady');
  await userEvent.keyboard('{Delete}{Backspace}');

  await expect.element(screen.getByText(/Delete the/)).not.toBeInTheDocument();
  expect((await storedModels()).length).toBe(2);
});

test('Delete on a selected target asks, and confirming releases the binding into a draft', async () => {
  const screen = await canvasPageOn();

  await userEvent.click(screen.getByRole('button', { name: /work/ }));
  await userEvent.keyboard('{Delete}');

  await expect.element(screen.getByText(/Delete the target "work"/)).toBeVisible();

  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: 'Delete' }));

  await expect.poll(async () => storedBindingOf('fast')).toBeUndefined();
  await expect.poll(() => draftCardOn(screen.container)).not.toBeNull();
  expect(draftCardOn(screen.container)?.querySelector('button')).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await expect.element(screen.getByRole('complementary')).not.toBeInTheDocument();
});

test('the drawer delete link asks the same question before a virtual model leaves', async () => {
  const screen = await canvasPageOn();

  await userEvent.click(screen.getByRole('button', { name: /Fast/ }));
  await userEvent.click(screen.getByRole('button', { name: 'Delete virtual model' }));

  await expect.element(screen.getByText(/Delete the virtual model "Fast"/)).toBeVisible();

  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: 'Cancel' }));

  await expect.element(screen.getByText(/Delete the virtual model/)).not.toBeInTheDocument();
  expect(await storedBindingOf('fast')).toBeDefined();
});

test('the drawer delete on a target asks, and confirming releases the binding', async () => {
  const screen = await canvasPageOn();

  await userEvent.click(screen.getByRole('button', { name: /work/ }));
  await userEvent.click(screen.getByRole('button', { name: 'Delete provider' }));

  await expect.element(screen.getByText(/Delete the target "work"/)).toBeVisible();

  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: 'Delete' }));

  await expect.poll(async () => storedBindingOf('fast')).toBeUndefined();
  await expect.poll(() => draftCardOn(screen.container)?.textContent).toContain('Fast');
});

test('Cancel on the target question leaves the binding exactly as it stood', async () => {
  const screen = await canvasPageOn();

  await userEvent.click(screen.getByRole('button', { name: /work/ }));
  await userEvent.keyboard('{Delete}');
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

  await expect.element(screen.getByText(/Delete the target/)).not.toBeInTheDocument();
  expect(await storedBindingOf('fast')).toEqual({
    accountId: 'k1',
    providerModel: 'claude-haiku-4-5',
  });
});

test('a gateway nobody named asks its removal by the slug it stores under', async () => {
  standCanvasBridge({
    gateways: [gatewaySeed({ slug: 'my-gateway', displayName: '', port: 8397 })],
  });

  const screen = await renderCanvasPage(false, undefined, /:8397/);

  toggleInspector();

  await userEvent.click(screen.getByRole('button', { name: 'Delete gateway' }));

  await expect.element(screen.getByText(/Delete the gateway "my-gateway"/)).toBeVisible();

  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

  await expect.element(screen.getByText(/Delete the gateway/)).not.toBeInTheDocument();
});
