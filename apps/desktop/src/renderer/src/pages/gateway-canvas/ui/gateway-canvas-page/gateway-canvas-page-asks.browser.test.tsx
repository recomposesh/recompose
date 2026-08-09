import { beforeEach, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import { draftCardOn, storedBindingOf, storedModels } from '../../testing/canvas-gestures.testkit';
import { canvasPageOn, freshCanvasRun } from '../../testing/canvas-page.testkit';

vi.setConfig({ testTimeout: 40_000 });

beforeEach(freshCanvasRun);

const CONTRACT_CARD = { width: 158, height: 78 };
const SEAT_READING = /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/u;
const VIEW_READING = /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)\s*scale\(([\d.]+)\)/u;

function paintedWithin(corner: { x: number; y: number }, zoom: number, pane: DOMRect): boolean {
  return (
    corner.x >= 0 &&
    corner.y >= 0 &&
    corner.x + CONTRACT_CARD.width * zoom <= pane.width &&
    corner.y + CONTRACT_CARD.height * zoom <= pane.height
  );
}

function transformOf(container: HTMLElement, selector: string): string {
  return container.querySelector<HTMLElement>(selector)?.style.transform ?? '';
}

function fitsReading(seat: RegExpExecArray, view: RegExpExecArray, pane: DOMRect): string {
  const zoom = Number(view[3]);
  const corner = {
    x: Number(seat[1]) * zoom + Number(view[1]),
    y: Number(seat[2]) * zoom + Number(view[2]),
  };

  return paintedWithin(corner, zoom, pane) ? 'fits' : 'past the pane';
}

function bornCardReading(container: HTMLElement, nodeId: string): string {
  const pane = container.querySelector('.react-flow')?.getBoundingClientRect();
  const seat = SEAT_READING.exec(transformOf(container, `[data-id="${nodeId}"]`));
  const view = VIEW_READING.exec(transformOf(container, '.react-flow__viewport'));

  if (seat === null || view === null || pane === undefined) {
    return 'unpainted';
  }

  return fitsReading(seat, view, pane);
}

test('the gateway ask births a draft wired to the gateway, with the name field focused', async () => {
  const screen = await canvasPageOn();

  screen.getByLabelText('Add a virtual model').element().focus();
  await userEvent.keyboard('{Enter}');

  await expect
    .poll(() => draftCardOn(screen.container)?.textContent)
    .toContain('Unnamed virtual model');
  expect(screen.container.querySelector('[data-id="overlay:draft"]')).not.toBeNull();
  await expect.element(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus();
});

test("a virtual model's ask opens the picker of stored accounts without a drag", async () => {
  const screen = await canvasPageOn();

  screen.getByLabelText('Choose a target').first().element().focus();
  await userEvent.keyboard('{Enter}');

  await expect.element(screen.getByText('Pick an account', { exact: true })).toBeVisible();
  await expect
    .element(screen.getByRole('dialog').getByRole('button', { name: 'openrouter' }))
    .toBeVisible();
});

test('the ask and the picker bind with no pointer at all', async () => {
  const screen = await canvasPageOn();
  const ask = screen.getByLabelText('Choose a target').first();

  ask.element().focus();
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

  screen.getByLabelText('Add a virtual model').element().focus();
  await userEvent.keyboard('{Enter}');
  await screen.getByRole('textbox', { name: 'Name' }).fill('Steady');

  screen.getByLabelText('Choose a target').last().element().focus();
  await userEvent.keyboard('{Enter}');
  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: 'work' }));
  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: 'claude-opus-5' }));

  await expect
    .poll(async () => storedBindingOf('steady'))
    .toEqual({ accountId: 'k1', providerModel: 'claude-opus-5' });
  await expect.element(screen.getByRole('button', { name: /Steady/ })).toBeVisible();
});

test('a completed binding says so in the live region, politely', async () => {
  const screen = await canvasPageOn();

  screen.getByLabelText('Choose a target').first().element().focus();
  await userEvent.keyboard('{Enter}');
  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: 'work' }));
  await userEvent.click(
    screen.getByRole('dialog').getByRole('button', { name: 'claude-sonnet-5' }),
  );

  const polite = screen.container.querySelector('section > p[aria-live="polite"]');

  await expect.poll(() => polite?.textContent).toBe('Rebound the virtual model "Fast" to "work".');
});

test('a refused write interrupts with the refusal, and the draft holds', async () => {
  const screen = await canvasPageOn();

  screen.getByLabelText('Add a virtual model').element().focus();
  await userEvent.keyboard('{Enter}');
  screen.getByLabelText('Choose a target').last().element().focus();
  await userEvent.keyboard('{Enter}');
  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: 'work' }));
  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: 'claude-opus-5' }));

  const assertive = screen.container.querySelector('section > p[aria-live="assertive"]');

  await expect.poll(() => assertive?.textContent).toContain('Refused the binding.');
  await expect
    .poll(() => draftCardOn(screen.container)?.textContent)
    .toContain('Unnamed virtual model');
  expect((await storedModels()).length).toBe(2);
});

test('a target born past the pane zooms the view out until it shows', async () => {
  const screen = await canvasPageOn({
    providerModels: { k1: ['claude-haiku-4-5'], s1: ['claude-sonnet-5'] },
  });
  const zoomIn = screen.getByRole('button', { name: 'Zoom in' });

  for (let steps = 0; steps < 5; steps += 1) {
    await userEvent.click(zoomIn);
  }

  screen.getByLabelText('Add a virtual model').element().focus();
  await userEvent.keyboard('{Enter}');
  await screen.getByRole('textbox', { name: 'Name' }).fill('Steady');
  screen.getByLabelText('Choose a target').last().element().focus();
  await userEvent.keyboard('{Enter}');
  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: 'Claude' }));
  await userEvent.click(
    screen.getByRole('dialog').getByRole('button', { name: 'claude-sonnet-5' }),
  );

  await expect.poll(async () => storedBindingOf('steady')).toBeDefined();
  await expect.poll(() => bornCardReading(screen.container, 'target:s1')).toBe('fits');
});

test('an account whose models cannot be read says so in the picker instead of nothing', async () => {
  const screen = await canvasPageOn({ providerModels: {} });

  screen.getByLabelText('Choose a target').first().element().focus();
  await userEvent.keyboard('{Enter}');
  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: 'work' }));

  await expect
    .element(screen.getByRole('dialog').getByText(/couldn't read this account's model list/))
    .toBeVisible();
});
