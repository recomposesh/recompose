import type { Locator } from 'vitest/browser';

import { beforeEach, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import { heldDraft } from '../../lib/use-held-draft';
import { clickedCable, storedModels } from '../../testing/canvas-gestures.testkit';
import { canvasPageOn, freshCanvasRun } from '../../testing/canvas-page.testkit';

vi.setConfig({ testTimeout: 40_000 });

beforeEach(freshCanvasRun);

const UNREACHABLE_PROVIDER = 'recompose could not reach the provider to read its models.';
const FULL_DISK = 'recompose could not write the gateway to disk.';

const refusedModelList = {
  'accounts:list-models': async () =>
    Promise.resolve({
      ok: false as const,
      error: { code: 'storage-failed' as const, message: UNREACHABLE_PROVIDER },
    }),
};

const refusedWrite = {
  'gateways:update': async () =>
    Promise.resolve({
      ok: false as const,
      error: { code: 'storage-failed' as const, message: FULL_DISK },
    }),
};

async function draftedInspectorOn(parameters = {}) {
  const screen = await canvasPageOn(parameters);

  screen.getByLabelText('Add a virtual model').element().focus();
  await userEvent.keyboard('{Enter}');

  await expect.element(screen.getByRole('textbox', { name: 'Name' })).toBeVisible();

  return { screen, panel: screen.getByRole('complementary') };
}

/**
 * Answers the ask the routing box opens on, which every provider step now stands behind.
 *
 * @summary The drawer asks which shape a binding takes before it offers any provider, the same
 * question a released cable asks, so a spec about providers walks through it rather than around it.
 */
async function answeredWithAProvider(panel: Locator): Promise<void> {
  await userEvent.click(panel.getByRole('button', { name: /^Provider One provider/ }));
}

test("a model-list look the main process refuses reads back in the main process's own words", async () => {
  const { panel } = await draftedInspectorOn({ overrides: refusedModelList });

  await answeredWithAProvider(panel);
  await userEvent.click(panel.getByRole('button', { name: 'work' }));

  await expect.element(panel.getByRole('alert')).toHaveTextContent(UNREACHABLE_PROVIDER);
});

test('a whole binding with no name holds the save shut, and naming it opens the save', async () => {
  const { screen, panel } = await draftedInspectorOn();

  await answeredWithAProvider(panel);
  await userEvent.click(panel.getByRole('button', { name: 'work' }));
  await userEvent.click(panel.getByRole('button', { name: 'claude-opus-5' }));

  await expect.element(screen.getByRole('button', { name: 'Add virtual model' })).toBeDisabled();
  expect((await storedModels()).length).toBe(2);

  await screen.getByRole('textbox', { name: 'Name' }).fill('Steady');

  await expect.element(screen.getByRole('button', { name: 'Add virtual model' })).toBeEnabled();
});

test('selecting a released virtual model does not move focus into its name', async () => {
  const screen = await canvasPageOn();

  await clickedCable(screen.container, 'cable:fast');
  await userEvent.keyboard('{Delete}');

  await expect.element(screen.getByRole('textbox', { name: 'Name' })).toBeVisible();
  await expect.element(screen.getByRole('textbox', { name: 'Name' })).not.toHaveFocus();
});

test('stepping back to the target choice lets the picked model go with the target', async () => {
  const { panel } = await draftedInspectorOn();

  await answeredWithAProvider(panel);
  await userEvent.click(panel.getByRole('button', { name: 'work' }));
  await userEvent.click(panel.getByRole('button', { name: 'claude-opus-5' }));

  await expect.poll(() => heldDraft('my-gateway')?.definition.providerModel).toBe('claude-opus-5');

  await userEvent.click(panel.getByRole('button', { name: 'Select a different provider' }));

  await expect.element(panel.getByRole('button', { name: 'work' })).toBeVisible();
  expect(heldDraft('my-gateway')?.definition.accountId).toBe('');
  expect(heldDraft('my-gateway')?.definition.providerModel).toBe('');
});

test('a save the store refuses says why in the inspector and holds every word typed', async () => {
  const { screen, panel } = await draftedInspectorOn({ overrides: refusedWrite });

  await screen.getByRole('textbox', { name: 'Name' }).fill('Steady');
  await answeredWithAProvider(panel);
  await userEvent.click(panel.getByRole('button', { name: 'work' }));
  await userEvent.click(panel.getByRole('button', { name: 'claude-opus-5' }));
  await userEvent.click(screen.getByRole('button', { name: 'Add virtual model' }));

  await expect.element(panel.getByRole('alert')).toHaveTextContent(FULL_DISK);
  await expect.element(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Steady');
  expect((await storedModels()).length).toBe(2);
});

test('typing on after a refused save takes the refusal away, since the words changed', async () => {
  const { screen, panel } = await draftedInspectorOn({ overrides: refusedWrite });

  await screen.getByRole('textbox', { name: 'Name' }).fill('Steady');
  await answeredWithAProvider(panel);
  await userEvent.click(panel.getByRole('button', { name: 'work' }));
  await userEvent.click(panel.getByRole('button', { name: 'claude-opus-5' }));
  await userEvent.click(screen.getByRole('button', { name: 'Add virtual model' }));

  await expect.element(panel.getByRole('alert')).toHaveTextContent(FULL_DISK);

  await screen.getByRole('textbox', { name: 'Name' }).fill('Steadier');

  await expect.element(panel.getByRole('alert')).not.toBeInTheDocument();
});
