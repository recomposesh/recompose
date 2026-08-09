import { beforeEach, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import { draftCardOn, storedBindingOf, storedModels } from '../../testing/canvas-gestures.testkit';
import { canvasPageOn, freshCanvasRun } from '../../testing/canvas-page.testkit';

vi.setConfig({ testTimeout: 40_000 });

beforeEach(freshCanvasRun);

test('the gateway plus births a draft wired to the gateway, with the name field focused', async () => {
  const screen = await canvasPageOn();

  await userEvent.click(screen.getByLabelText('Add a virtual model'));

  await expect
    .poll(() => draftCardOn(screen.container)?.textContent)
    .toContain('Unnamed virtual model');
  expect(screen.container.querySelector('[data-id="overlay:draft"]')).not.toBeNull();
  await expect.element(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus();
});

test("a virtual model's plus opens the picker of stored accounts without a drag", async () => {
  const screen = await canvasPageOn();

  await userEvent.click(screen.getByLabelText('Choose a target').first());

  await expect.element(screen.getByText('Pick an account', { exact: true })).toBeVisible();
  await expect
    .element(screen.getByRole('dialog').getByRole('button', { name: 'openrouter' }))
    .toBeVisible();
});

test('the plus and the picker bind with no pointer at all', async () => {
  const screen = await canvasPageOn();
  const plus = screen.getByLabelText('Choose a target').first();

  await expect.element(plus).toBeVisible();
  plus.element().focus();
  await userEvent.keyboard('{Enter}');

  const work = screen.getByRole('dialog').getByRole('button', { name: 'work' });

  await expect.element(work).toBeVisible();
  work.element().focus();
  await userEvent.keyboard('{Enter}');

  const model = screen.getByRole('dialog').getByRole('button', { name: 'claude-sonnet-5' });

  await expect.element(model).toBeVisible();
  model.element().focus();
  await userEvent.keyboard('{Enter}');

  await expect
    .poll(async () => storedBindingOf('fast'))
    .toEqual({ accountId: 'k1', providerModel: 'claude-sonnet-5' });
});

test('a named draft completed through the picker graduates into the composition', async () => {
  const screen = await canvasPageOn();

  await userEvent.click(screen.getByLabelText('Add a virtual model'));
  await screen.getByRole('textbox', { name: 'Name' }).fill('Steady');

  await userEvent.click(screen.getByLabelText('Choose a target').last());
  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: 'work' }));
  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: 'claude-opus-5' }));

  await expect
    .poll(async () => storedBindingOf('steady'))
    .toEqual({ accountId: 'k1', providerModel: 'claude-opus-5' });
  await expect.element(screen.getByRole('button', { name: /Steady/ })).toBeVisible();
});

test('a completed binding says so in the live region, politely', async () => {
  const screen = await canvasPageOn();

  await userEvent.click(screen.getByLabelText('Choose a target').first());
  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: 'work' }));
  await userEvent.click(
    screen.getByRole('dialog').getByRole('button', { name: 'claude-sonnet-5' }),
  );

  const polite = screen.container.querySelector('section > p[aria-live="polite"]');

  await expect.poll(() => polite?.textContent).toBe('Rebound the virtual model "Fast" to "work".');
});

test('a refused write interrupts with the refusal, and the draft holds', async () => {
  const screen = await canvasPageOn();

  await userEvent.click(screen.getByLabelText('Add a virtual model'));
  await userEvent.click(screen.getByLabelText('Choose a target').last());
  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: 'work' }));
  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: 'claude-opus-5' }));

  const assertive = screen.container.querySelector('section > p[aria-live="assertive"]');

  await expect.poll(() => assertive?.textContent).toContain('Refused the binding.');
  await expect
    .poll(() => draftCardOn(screen.container)?.textContent)
    .toContain('Unnamed virtual model');
  expect((await storedModels()).length).toBe(2);
});
