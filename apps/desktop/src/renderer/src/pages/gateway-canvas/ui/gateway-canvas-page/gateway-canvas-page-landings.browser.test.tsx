import { beforeEach, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import type { XY } from '../../lib/canvas-positions';

import { toggleInspector } from '../../../../shared/lib';
import {
  draggedCable,
  pulledCable,
  reconnectAnchorOf,
  releasedAt,
  sourceAnchorOf,
  sourcePortOf,
  storedBindingOf,
  storedModels,
  targetPortOf,
} from '../../testing/canvas-gestures.testkit';
import { canvasPageOn, freshCanvasRun } from '../../testing/canvas-page.testkit';

vi.setConfig({ testTimeout: 40_000 });

beforeEach(freshCanvasRun);

const POSITIONS_KEY = 'recompose.canvas.positions.my-gateway';

function seatedInsideThePane(): void {
  localStorage.setItem(POSITIONS_KEY, JSON.stringify({ 'target:fast': { x: 560, y: 280 } }));
}

function paneSpot(container: HTMLElement, from: XY): XY {
  const box = container.querySelector('.react-flow')?.getBoundingClientRect() ?? new DOMRect();

  return { x: box.left + from.x, y: box.top + from.y };
}

test('a fresh cable landed on a stored target opens the pick on that very target', async () => {
  seatedInsideThePane();

  const screen = await canvasPageOn();

  screen.getByLabelText('Add a virtual model').element().focus();
  await userEvent.keyboard('{Enter}');
  await screen.getByRole('textbox', { name: 'Name' }).fill('Steady');
  await draggedCable(
    await sourcePortOf(screen.container, 'draft'),
    await targetPortOf(screen.container, 'target:fast'),
  );

  await expect.element(screen.getByText('Pick a provider model', { exact: true })).toBeVisible();

  await userEvent.click(
    screen.getByRole('dialog').getByRole('button', { name: 'claude-sonnet-5' }),
  );

  await expect
    .poll(async () => storedBindingOf('steady'))
    .toEqual({ accountId: 'k1', providerModel: 'claude-sonnet-5' });
});

test('a cable regrabbed at its model end and dropped on the draft rebinds nothing', async () => {
  localStorage.setItem(POSITIONS_KEY, JSON.stringify({ 'model:creative': { x: 600, y: 430 } }));

  const screen = await canvasPageOn();
  const before = await storedModels();

  screen.getByLabelText('Add a virtual model').element().focus();
  await userEvent.keyboard('{Enter}');
  await expect.element(screen.getByRole('textbox', { name: 'Name' })).toBeVisible();
  await draggedCable(
    await sourceAnchorOf(screen.container, 'cable:creative'),
    await sourcePortOf(screen.container, 'draft'),
  );

  await expect
    .element(screen.getByText('Pick a provider model', { exact: true }))
    .not.toBeInTheDocument();
  expect(await storedModels()).toEqual(before);
});

test('a cable end let go on open canvas opens the rebind pick where it landed', async () => {
  seatedInsideThePane();

  const screen = await canvasPageOn();
  const spot = paneSpot(screen.container, { x: 520, y: 470 });

  await pulledCable(await reconnectAnchorOf(screen.container, 'cable:creative'), spot);
  releasedAt(spot);

  await expect.element(screen.getByText('Pick an account', { exact: true })).toBeVisible();

  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: 'work' }));
  await userEvent.click(
    screen.getByRole('dialog').getByRole('button', { name: 'claude-sonnet-5' }),
  );

  await expect
    .poll(async () => storedBindingOf('creative'))
    .toEqual({ accountId: 'k1', providerModel: 'claude-sonnet-5' });
});

test('Delete on the pending card removes nothing and the pick keeps standing', async () => {
  const screen = await canvasPageOn();
  const before = await storedModels();
  const spot = paneSpot(screen.container, { x: 520, y: 420 });

  screen.getByLabelText('Add a virtual model').element().focus();
  await userEvent.keyboard('{Enter}');
  await pulledCable(await sourcePortOf(screen.container, 'draft'), spot);
  releasedAt(spot);
  await expect.element(screen.getByText('Pick an account', { exact: true })).toBeVisible();

  toggleInspector();

  await expect
    .poll(() => {
      const pendingCard = screen.container.querySelector<HTMLElement>(
        '.react-flow__node[data-id="pending"] button[aria-pressed]',
      );

      pendingCard?.focus();

      return pendingCard?.getAttribute('aria-pressed');
    })
    .toBe('true');
  await userEvent.keyboard('{Delete}');

  await expect.element(screen.getByText(/Delete the/)).not.toBeInTheDocument();
  await expect.element(screen.getByText('Pick an account', { exact: true })).toBeVisible();
  expect(screen.container.querySelector('[data-id="pending"]')).not.toBeNull();
  expect(await storedModels()).toEqual(before);
});
