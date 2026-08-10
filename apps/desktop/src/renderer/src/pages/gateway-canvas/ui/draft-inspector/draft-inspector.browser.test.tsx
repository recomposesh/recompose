import { beforeEach, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import { storedModels } from '../../testing/canvas-gestures.testkit';
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

test("a model-list look the main process refuses reads back in the main process's own words", async () => {
  const { panel } = await draftedInspectorOn({ overrides: refusedModelList });

  await userEvent.click(panel.getByRole('button', { name: 'work' }));

  await expect.element(panel.getByRole('alert')).toHaveTextContent(UNREACHABLE_PROVIDER);
});

test('adding a virtual model with no name refuses beside the name and stores nothing', async () => {
  const { screen, panel } = await draftedInspectorOn();

  await userEvent.click(panel.getByRole('button', { name: 'work' }));
  await userEvent.click(panel.getByRole('button', { name: 'claude-opus-5' }));
  await userEvent.click(screen.getByRole('button', { name: 'Add virtual model' }));

  await expect.element(screen.getByText('Give the virtual model a name.')).toBeVisible();
  expect((await storedModels()).length).toBe(2);
});

test('a save the store refuses says why in the inspector and holds every word typed', async () => {
  const { screen, panel } = await draftedInspectorOn({ overrides: refusedWrite });

  await screen.getByRole('textbox', { name: 'Name' }).fill('Steady');
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
  await userEvent.click(panel.getByRole('button', { name: 'work' }));
  await userEvent.click(panel.getByRole('button', { name: 'claude-opus-5' }));
  await userEvent.click(screen.getByRole('button', { name: 'Add virtual model' }));

  await expect.element(panel.getByRole('alert')).toHaveTextContent(FULL_DISK);

  await screen.getByRole('textbox', { name: 'Name' }).fill('Steadier');

  await expect.element(panel.getByRole('alert')).not.toBeInTheDocument();
});
