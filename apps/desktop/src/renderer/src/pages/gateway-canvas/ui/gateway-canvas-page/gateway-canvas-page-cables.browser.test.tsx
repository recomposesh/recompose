import { beforeEach, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import {
  draggedCable,
  draggedCableOver,
  pulledCable,
  reconnectAnchorOf,
  releasedAt,
  sourcePortOf,
  storedBindingOf,
  storedModels,
  targetPortOf,
} from '../../testing/canvas-gestures.testkit';
import { canvasPageOn, freshCanvasRun, pickedTheTarget } from '../../testing/canvas-page.testkit';
import { accountsWithout } from '../../testing/gateway-canvas.testkit';

vi.setConfig({ testTimeout: 40_000 });

beforeEach(freshCanvasRun);

const POSITIONS_KEY = 'recompose.canvas.positions.my-gateway';

function seatedInsideThePane(): void {
  localStorage.setItem(POSITIONS_KEY, JSON.stringify({ 'target:fast': { x: 560, y: 280 } }));
}

async function draftPulledTo(
  screen: Awaited<ReturnType<typeof canvasPageOn>>,
  at: { x: number; y: number },
) {
  screen.getByLabelText('Add a virtual model').element().focus();
  await userEvent.keyboard('{Enter}');
  await pulledCable(await sourcePortOf(screen.container, 'draft'), at);
  releasedAt(at);
  await pickedTheTarget(screen);
}

test('a bound virtual model offers no new cable out of its port', async () => {
  const screen = await canvasPageOn();
  const before = await storedModels();
  const port = await sourcePortOf(screen.container, 'model:creative');
  const box = port.getBoundingClientRect();
  const grip = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

  port.dispatchEvent(
    new MouseEvent('mousedown', { bubbles: true, clientX: grip.x, clientY: grip.y }),
  );
  document.dispatchEvent(
    new MouseEvent('mousemove', { bubbles: true, clientX: grip.x + 60, clientY: grip.y + 40 }),
  );
  document.dispatchEvent(
    new MouseEvent('mousemove', { bubbles: true, clientX: grip.x + 120, clientY: grip.y + 90 }),
  );

  expect(document.querySelector('.react-flow__connectionline')).toBeNull();

  document.dispatchEvent(
    new MouseEvent('mouseup', { bubbles: true, clientX: grip.x + 120, clientY: grip.y + 90 }),
  );

  await expect
    .element(screen.getByText('Pick a provider model', { exact: true }))
    .not.toBeInTheDocument();
  expect(await storedModels()).toEqual(before);
});

test('dragging a cable target endpoint onto another stored target rebinds through the pick', async () => {
  seatedInsideThePane();

  const screen = await canvasPageOn();

  await draggedCable(
    await reconnectAnchorOf(screen.container, 'cable:creative'),
    await targetPortOf(screen.container, 'target:fast'),
  );
  await userEvent.click(
    screen.getByRole('dialog').getByRole('button', { name: 'claude-sonnet-5' }),
  );

  await expect
    .poll(async () => storedBindingOf('creative'))
    .toEqual({ accountId: 'k1', providerModel: 'claude-sonnet-5' });
});

test('stepping back mid-rebind reopens the accounts, and the fresh pick still lands', async () => {
  seatedInsideThePane();

  const screen = await canvasPageOn();

  await draggedCable(
    await reconnectAnchorOf(screen.container, 'cable:creative'),
    await targetPortOf(screen.container, 'target:fast'),
  );

  await expect.element(screen.getByText('Pick a provider model', { exact: true })).toBeVisible();

  await userEvent.click(screen.getByRole('button', { name: 'Select different provider' }));

  await expect.element(screen.getByText('Pick an account', { exact: true })).toBeVisible();

  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: 'work' }));
  await userEvent.click(
    screen.getByRole('dialog').getByRole('button', { name: 'claude-sonnet-5' }),
  );

  await expect
    .poll(async () => storedBindingOf('creative'))
    .toEqual({ accountId: 'k1', providerModel: 'claude-sonnet-5' });
});

test('a click along the gateway wire reaches the pane, so it still dismisses the selection', async () => {
  const screen = await canvasPageOn();

  await userEvent.click(screen.getByRole('button', { name: /Fast/ }));
  await expect.poll(() => screen.container.querySelector('aside')).not.toBeNull();

  const pane = screen.container.querySelector<HTMLElement>('.react-flow__pane');
  const wire = screen.container.querySelector<SVGPathElement>(
    '[data-id="wire:model:fast"] .react-flow__edge-path',
  );

  if (pane === null || wire === null) {
    throw new Error('the canvas stands without its pane or the gateway wire');
  }

  const paneBox = pane.getBoundingClientRect();
  const wireBox = wire.getBoundingClientRect();

  await userEvent.click(pane, {
    position: {
      x: wireBox.left + wireBox.width / 2 - paneBox.left,
      y: wireBox.top + wireBox.height / 2 + 6 - paneBox.top,
    },
  });

  await expect.poll(() => screen.container.querySelector('aside')).toBeNull();
});

test('a cable dropped on empty canvas births the pending card and opens the picker', async () => {
  const screen = await canvasPageOn();

  await draftPulledTo(screen, { x: 620, y: 320 });

  await expect.element(screen.getByText('Pick an account', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('Choose a target', { exact: true }).first()).toBeVisible();
});

test('Esc dismisses the picker and the pending card together, changing nothing', async () => {
  const screen = await canvasPageOn();
  const before = await storedModels();

  await draftPulledTo(screen, { x: 620, y: 320 });
  await expect.element(screen.getByText('Pick an account', { exact: true })).toBeVisible();

  await userEvent.keyboard('{Escape}');

  await expect
    .element(screen.getByText('Pick an account', { exact: true }))
    .not.toBeInTheDocument();
  expect(await storedModels()).toEqual(before);
});

test('a completed pick on a pending card writes the binding it stands for', async () => {
  const screen = await canvasPageOn();

  screen.getByLabelText('Add a virtual model').element().focus();
  await userEvent.keyboard('{Enter}');
  await screen.getByRole('textbox', { name: 'Name' }).fill('Steady');
  await pulledCable(await sourcePortOf(screen.container, 'draft'), { x: 620, y: 320 });
  releasedAt({ x: 620, y: 320 });
  await pickedTheTarget(screen);

  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: 'work' }));
  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: 'claude-opus-5' }));

  await expect
    .poll(async () => storedBindingOf('steady'))
    .toEqual({ accountId: 'k1', providerModel: 'claude-opus-5' });
  await expect
    .element(screen.getByText('Pick an account', { exact: true }))
    .not.toBeInTheDocument();
});

test('Esc cancels a drag in flight and the composition stands unchanged', async () => {
  const screen = await canvasPageOn();
  const before = await storedModels();

  screen.getByLabelText('Add a virtual model').element().focus();
  await userEvent.keyboard('{Enter}');
  await pulledCable(await sourcePortOf(screen.container, 'draft'), { x: 620, y: 320 });
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

  await expect.poll(() => document.querySelector('.react-flow__connectionline')).toBeNull();
  await expect
    .element(screen.getByText('Pick an account', { exact: true }))
    .not.toBeInTheDocument();
  expect(await storedModels()).toEqual(before);
});

test('Esc cancelling a drag leaves the selection standing beside it', async () => {
  const screen = await canvasPageOn();

  screen.getByLabelText('Add a virtual model').element().focus();
  await userEvent.keyboard('{Enter}');
  await expect.element(screen.getByRole('complementary')).toBeVisible();

  await pulledCable(await sourcePortOf(screen.container, 'draft'), { x: 620, y: 320 });

  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }

  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

  await expect.poll(() => document.querySelector('.react-flow__connectionline')).toBeNull();
  await expect.element(screen.getByRole('complementary')).toBeVisible();
});

test('Esc over a valid target port cancels the drag instead of opening the picker', async () => {
  seatedInsideThePane();

  const screen = await canvasPageOn();
  const before = await storedModels();

  screen.getByLabelText('Add a virtual model').element().focus();
  await userEvent.keyboard('{Enter}');
  await draggedCableOver(
    await sourcePortOf(screen.container, 'draft'),
    await targetPortOf(screen.container, 'target:fast'),
  );
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

  await expect.poll(() => document.querySelector('.react-flow__connectionline')).toBeNull();
  await expect
    .element(screen.getByText('Pick a provider model', { exact: true }))
    .not.toBeInTheDocument();
  expect(await storedModels()).toEqual(before);
});

test('a gateway cable dropped on a target refuses out loud and changes nothing', async () => {
  seatedInsideThePane();

  const screen = await canvasPageOn();
  const before = await storedModels();

  await draggedCable(
    await sourcePortOf(screen.container, 'gateway'),
    await targetPortOf(screen.container, 'target:fast'),
  );

  await expect
    .poll(() => screen.container.querySelector('section > p[aria-live="assertive"]')?.textContent, {
      timeout: 10_000,
    })
    .toContain('Refused the binding.');
  expect(await storedModels()).toEqual(before);
});

test('a broken binding repairs through the same drop, reading as repaired', async () => {
  seatedInsideThePane();

  const screen = await canvasPageOn({ accounts: accountsWithout('g1') });

  await expect.element(screen.getByText('Removed', { exact: true })).toBeVisible();

  await draggedCable(
    await reconnectAnchorOf(screen.container, 'cable:creative'),
    await targetPortOf(screen.container, 'target:fast'),
  );
  await userEvent.click(
    screen.getByRole('dialog').getByRole('button', { name: 'claude-sonnet-5' }),
  );

  await expect
    .poll(async () => storedBindingOf('creative'))
    .toEqual({ accountId: 'k1', providerModel: 'claude-sonnet-5' });
  await expect.element(screen.getByText('Removed', { exact: true })).not.toBeInTheDocument();
});
