import { beforeEach, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import {
  clickedCable,
  draftCardOn,
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
import { canvasPageOn, freshCanvasRun } from '../../testing/canvas-page.testkit';
import { accountsWithout } from '../../testing/gateway-canvas.testkit';

vi.setConfig({ testTimeout: 40_000 });

beforeEach(freshCanvasRun);

const POSITIONS_KEY = 'recompose.canvas.positions.my-gateway';

function seatedInsideThePane(): void {
  localStorage.setItem(POSITIONS_KEY, JSON.stringify({ 'target:k1': { x: 560, y: 280 } }));
}

test('a cable dragged from a virtual model port onto a target card rebinds it there', async () => {
  seatedInsideThePane();

  const screen = await canvasPageOn();

  await draggedCable(
    await sourcePortOf(screen.container, 'model:creative'),
    await targetPortOf(screen.container, 'target:k1'),
  );

  await userEvent.click(
    screen.getByRole('dialog').getByRole('button', { name: 'claude-sonnet-5' }),
  );

  await expect
    .poll(async () => storedBindingOf('creative'))
    .toEqual({ accountId: 'k1', providerModel: 'claude-sonnet-5' });
});

test('dragging a cable target endpoint onto another stored target rebinds through the pick', async () => {
  seatedInsideThePane();

  const screen = await canvasPageOn();

  await draggedCable(
    await reconnectAnchorOf(screen.container, 'cable:creative'),
    await targetPortOf(screen.container, 'target:k1'),
  );
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

  await pulledCable(await sourcePortOf(screen.container, 'model:creative'), { x: 620, y: 320 });
  releasedAt({ x: 620, y: 320 });

  await expect.element(screen.getByText('Pick an account', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('waiting on a pick', { exact: true })).toBeVisible();
});

test('Esc dismisses the picker and the pending card together, changing nothing', async () => {
  const screen = await canvasPageOn();
  const before = await storedModels();

  await pulledCable(await sourcePortOf(screen.container, 'model:creative'), { x: 620, y: 320 });
  releasedAt({ x: 620, y: 320 });
  await expect.element(screen.getByText('Pick an account', { exact: true })).toBeVisible();

  await userEvent.keyboard('{Escape}');

  await expect
    .element(screen.getByText('Pick an account', { exact: true }))
    .not.toBeInTheDocument();
  await expect
    .element(screen.getByText('waiting on a pick', { exact: true }))
    .not.toBeInTheDocument();
  expect(await storedModels()).toEqual(before);
});

test('a completed pick on a pending card writes the binding it stands for', async () => {
  const screen = await canvasPageOn();

  await pulledCable(await sourcePortOf(screen.container, 'model:creative'), { x: 620, y: 320 });
  releasedAt({ x: 620, y: 320 });

  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: 'work' }));
  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: 'claude-opus-5' }));

  await expect
    .poll(async () => storedBindingOf('creative'))
    .toEqual({ accountId: 'k1', providerModel: 'claude-opus-5' });
  await expect
    .element(screen.getByText('waiting on a pick', { exact: true }))
    .not.toBeInTheDocument();
});

test('Esc cancels a drag in flight and the composition stands unchanged', async () => {
  const screen = await canvasPageOn();
  const before = await storedModels();

  await pulledCable(await sourcePortOf(screen.container, 'model:creative'), { x: 620, y: 320 });
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

  await expect.poll(() => document.querySelector('.react-flow__connectionline')).toBeNull();
  await expect
    .element(screen.getByText('Pick an account', { exact: true }))
    .not.toBeInTheDocument();
  expect(await storedModels()).toEqual(before);
});

test('Esc over a valid target port cancels the drag instead of opening the picker', async () => {
  seatedInsideThePane();

  const screen = await canvasPageOn();
  const before = await storedModels();

  await draggedCableOver(
    await sourcePortOf(screen.container, 'model:creative'),
    await targetPortOf(screen.container, 'target:k1'),
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
    await targetPortOf(screen.container, 'target:k1'),
  );

  await expect
    .poll(() => screen.container.querySelector('section > p[aria-live="assertive"]')?.textContent, {
      timeout: 10_000,
    })
    .toContain('Refused the binding.');
  expect(await storedModels()).toEqual(before);
});

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
  await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

  await expect.poll(async () => storedBindingOf('fast')).toBeUndefined();
  expect(draftCardOn(screen.container)).toBeNull();
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

test('Delete on a selected target refuses, and its cables stay bound', async () => {
  const screen = await canvasPageOn();

  await userEvent.click(screen.getByRole('button', { name: /work/ }));
  await userEvent.keyboard('{Delete}');

  await expect.element(screen.getByText(/Delete the/)).not.toBeInTheDocument();
  expect(draftCardOn(screen.container)).toBeNull();
  expect(await storedBindingOf('fast')).toEqual({
    accountId: 'k1',
    providerModel: 'claude-haiku-4-5',
  });
});

test('a broken binding repairs through the same drop, reading as repaired', async () => {
  seatedInsideThePane();

  const screen = await canvasPageOn({ accounts: accountsWithout('g1') });

  await expect.element(screen.getByText('Removed', { exact: true })).toBeVisible();

  await draggedCable(
    await sourcePortOf(screen.container, 'model:creative'),
    await targetPortOf(screen.container, 'target:k1'),
  );
  await userEvent.click(
    screen.getByRole('dialog').getByRole('button', { name: 'claude-sonnet-5' }),
  );

  await expect
    .poll(async () => storedBindingOf('creative'))
    .toEqual({ accountId: 'k1', providerModel: 'claude-sonnet-5' });
  await expect.element(screen.getByText('Removed', { exact: true })).not.toBeInTheDocument();
});
