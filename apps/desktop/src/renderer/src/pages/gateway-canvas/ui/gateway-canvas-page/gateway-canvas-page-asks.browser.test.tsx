import type { GatewayConfig } from '@recompose/contracts';

import { beforeEach, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import { gatewaySeed } from '../../../../shared/testing';
import { draftCardOn, storedBindingOf, storedModels } from '../../testing/canvas-gestures.testkit';
import { canvasPageOn, freshCanvasRun, pickedTheTarget } from '../../testing/canvas-page.testkit';

vi.setConfig({ testTimeout: 40_000 });

beforeEach(freshCanvasRun);

const CONTRACT_CARD = { width: 184, height: 88 };
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

/**
 * Holds until every look a birth schedules has either moved the view or decided not to.
 *
 * @operation The look waits for frames rather than for anything a scenario can poll, so proving
 * the view stood still means outlasting it. A quarter second is well past the frames it waits and
 * still short of the timeout a scenario budget allows.
 */
async function afterEveryLookHasRun(): Promise<void> {
  await new Promise((settle) => {
    setTimeout(settle, 250);
  });
}

function gatewayServing(models: number): GatewayConfig {
  return gatewaySeed({
    slug: 'my-gateway',
    displayName: 'My Gateway',
    port: 8397,
    virtualModels: Array.from({ length: models }, (_, row) => ({
      id: `m${row}`,
      displayName: `Model ${row}`,
      routing: {
        entry: 'bound',
        nodes: { bound: { kind: 'target', accountId: 'k1', providerModel: 'claude-haiku-4-5' } },
      },
    })),
  });
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
  expect(screen.container.querySelector('[data-id="wire:draft"]')).not.toBeNull();
  await expect.element(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus();
});

test('typing an id another model already uses never makes the draft node disappear', async () => {
  const screen = await canvasPageOn();

  await userEvent.click(screen.getByLabelText('Add a virtual model'));
  await screen.getByRole('textbox', { name: 'Name' }).fill('Fast');

  await expect.poll(() => draftCardOn(screen.container)).not.toBeNull();
  await expect.element(screen.getByRole('button', { name: /Fast/ }).first()).toBeVisible();
});

test("a virtual model's ask opens the picker of stored accounts without a drag", async () => {
  const screen = await canvasPageOn();

  screen.getByLabelText('Pick a target').first().element().focus();
  await userEvent.keyboard('{Enter}');
  await pickedTheTarget(screen);

  await expect.element(screen.getByText('Connected providers', { exact: true })).toBeVisible();
  await expect
    .element(screen.getByRole('dialog').getByRole('button', { name: 'openrouter' }))
    .toBeVisible();
});

test('the ask and the picker bind with no pointer at all', async () => {
  const screen = await canvasPageOn();
  const ask = screen.getByLabelText('Pick a target').first();

  ask.element().focus();
  await userEvent.keyboard('{Enter}');

  const kind = screen.getByRole('dialog').getByRole('button', { name: /Provider/ });

  await expect.element(kind).toBeVisible();
  kind.element().focus();
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

  screen.getByLabelText('Pick a target').last().element().focus();
  await userEvent.keyboard('{Enter}');
  await pickedTheTarget(screen);
  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: 'work' }));
  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: 'claude-opus-5' }));

  await expect
    .poll(async () => storedBindingOf('steady'))
    .toEqual({ accountId: 'k1', providerModel: 'claude-opus-5' });
  await expect.element(screen.getByRole('button', { name: /Steady/ })).toBeVisible();
});

test('a completed binding says so in the live region, politely', async () => {
  const screen = await canvasPageOn();

  screen.getByLabelText('Pick a target').first().element().focus();
  await userEvent.keyboard('{Enter}');
  await pickedTheTarget(screen);
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
  await expect.element(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus();
  screen.getByLabelText('Pick a target').last().element().focus();
  await userEvent.keyboard('{Enter}');
  await pickedTheTarget(screen);
  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: 'work' }));
  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: 'claude-opus-5' }));

  const assertive = screen.container.querySelector('section > p[aria-live="assertive"]');

  await expect.poll(() => assertive?.textContent).toContain('Refused the binding.');
  await expect
    .poll(() => draftCardOn(screen.container)?.textContent)
    .toContain('Unnamed virtual model');
  expect((await storedModels()).length).toBe(2);
});

test('stepping back from the models returns the ask to the account choice', async () => {
  const screen = await canvasPageOn();

  screen.getByLabelText('Pick a target').first().element().focus();
  await userEvent.keyboard('{Enter}');
  await pickedTheTarget(screen);
  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: 'work' }));

  await expect.element(screen.getByText(/^Models .+ serves$/)).toBeVisible();

  await userEvent.click(screen.getByRole('button', { name: 'Select a different provider' }));

  await expect.element(screen.getByText('Connected providers', { exact: true })).toBeVisible();
  await expect
    .element(screen.getByRole('dialog').getByRole('button', { name: 'openrouter' }))
    .toBeVisible();
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
  screen.getByLabelText('Pick a target').last().element().focus();
  await userEvent.keyboard('{Enter}');
  await pickedTheTarget(screen);
  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: 'Claude' }));
  await userEvent.click(
    screen.getByRole('dialog').getByRole('button', { name: 'claude-sonnet-5' }),
  );

  await expect.poll(async () => storedBindingOf('steady')).toBeDefined();
  await expect
    .poll(() => bornCardReading(screen.container, 'target:steady'), { timeout: 10_000 })
    .toBe('fits');
});

test('a draft born inside the pane leaves the view exactly where it stood', async () => {
  const screen = await canvasPageOn();

  await expect.poll(() => transformOf(screen.container, '.react-flow__viewport')).not.toBe('');

  await userEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
  await userEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
  await afterEveryLookHasRun();

  const resting = transformOf(screen.container, '.react-flow__viewport');

  screen.getByLabelText('Add a virtual model').element().focus();
  await userEvent.keyboard('{Enter}');

  await expect.poll(() => draftCardOn(screen.container)).not.toBeNull();
  await afterEveryLookHasRun();

  expect(bornCardReading(screen.container, 'draft')).toBe('fits');
  expect(transformOf(screen.container, '.react-flow__viewport')).toBe(resting);
});

test('a draft born past the pane zooms the view out until it shows', async () => {
  const screen = await canvasPageOn({ gateways: [gatewayServing(5)] });

  screen.getByLabelText('Add a virtual model').element().focus();
  await userEvent.keyboard('{Enter}');

  await expect.poll(() => draftCardOn(screen.container)).not.toBeNull();
  await expect
    .poll(() => bornCardReading(screen.container, 'draft'), { timeout: 10_000 })
    .toBe('fits');
});

test('an account whose models cannot be read says so in the picker instead of nothing', async () => {
  const screen = await canvasPageOn({ providerModels: {} });

  screen.getByLabelText('Pick a target').first().element().focus();
  await userEvent.keyboard('{Enter}');
  await pickedTheTarget(screen);
  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: 'work' }));

  await expect
    .element(screen.getByRole('dialog').getByText(/couldn't read this account's model list/))
    .toBeVisible();
});
