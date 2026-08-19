import { beforeEach, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import type { XY } from '../../lib/canvas-positions';

import {
  clickedCable,
  clickedNodeFrame,
  draftCardOn,
  draggedCable,
  draggedCableOver,
  draggedCard,
  pulledCable,
  reconnectAnchorOf,
  releasedAt,
  sourceAnchorOf,
  sourcePortOf,
  storedModels,
  targetPortOf,
} from '../../testing/canvas-gestures.testkit';
import {
  canvasCommandLine,
  canvasPageOn,
  freshCanvasRun,
  pickedTheTarget,
  renderCanvasPage,
  standCanvasBridge,
} from '../../testing/canvas-page.testkit';

vi.setConfig({ testTimeout: 40_000 });

beforeEach(freshCanvasRun);

const POSITIONS_KEY = 'recompose.canvas.positions.my-gateway';

function seatedInsideThePane(): void {
  localStorage.setItem(POSITIONS_KEY, JSON.stringify({ 'target:fast': { x: 560, y: 280 } }));
}

function cardWrapper(container: HTMLElement, nodeId: string): HTMLElement | null {
  return container.querySelector<HTMLElement>(`.react-flow__node[data-id="${nodeId}"]`);
}

function seatOf(container: HTMLElement, nodeId: string): string {
  return cardWrapper(container, nodeId)?.style.transform ?? '';
}

function columnOf(container: HTMLElement, nodeId: string): string {
  return /translate\((-?[\d.]+px),/u.exec(seatOf(container, nodeId))?.[1] ?? '';
}

function paneOf(container: HTMLElement): HTMLElement {
  const pane = container.querySelector<HTMLElement>('.react-flow__pane');

  if (pane === null) {
    throw new Error('the canvas stands without its pane');
  }

  return pane;
}

function paneSpot(container: HTMLElement, from: XY): XY {
  const box = container.querySelector('.react-flow')?.getBoundingClientRect() ?? new DOMRect();

  return { x: box.left + from.x, y: box.top + from.y };
}

function cardCornerOn(container: HTMLElement, nodeId: string): XY | undefined {
  const card = cardWrapper(container, nodeId);
  const pane = container.querySelector('.react-flow')?.getBoundingClientRect();

  if (card === null || pane === undefined) {
    return undefined;
  }

  const box = card.getBoundingClientRect();

  return { x: Math.round(box.left - pane.left), y: Math.round(box.top - pane.top) };
}

function pressedStateOf(container: HTMLElement, nodeId: string): string | null {
  return (
    container
      .querySelector(`.react-flow__node[data-id="${nodeId}"] button[aria-pressed]`)
      ?.getAttribute('aria-pressed') ?? null
  );
}

test('a cable from the gateway let go on open canvas births a draft where it landed', async () => {
  const screen = await canvasPageOn();
  const letGo = { x: 520, y: 420 };
  const spot = paneSpot(screen.container, letGo);

  await pulledCable(await sourcePortOf(screen.container, 'gateway'), spot);
  releasedAt(spot);

  await expect
    .poll(() => draftCardOn(screen.container)?.textContent)
    .toContain('Unnamed virtual model');
  await expect
    .poll(() => cardCornerOn(screen.container, 'draft'))
    .toEqual({ x: letGo.x, y: letGo.y - 44 });
});

test('a press that lands on a card frame rather than the card leaves the selection alone', async () => {
  const screen = await canvasPageOn();

  await userEvent.click(screen.getByRole('button', { name: /Fast/ }));
  await expect.poll(() => pressedStateOf(screen.container, 'model:fast')).toBe('true');

  await clickedNodeFrame(screen.container, 'target:fast');

  await expect.poll(() => pressedStateOf(screen.container, 'target:fast')).toBe('false');
  expect(pressedStateOf(screen.container, 'model:fast')).toBe('true');
});

test('a press along the wire from the gateway selects nothing, since it stands for no binding', async () => {
  const screen = await canvasPageOn();

  await userEvent.click(screen.getByRole('button', { name: /Fast/ }));
  await expect.poll(() => pressedStateOf(screen.container, 'model:fast')).toBe('true');

  await clickedCable(screen.container, 'wire:model:fast');

  await expect.poll(() => pressedStateOf(screen.container, 'model:fast')).toBe('true');
});

test('a pane press while the picker stands puts the pick and its pending card away', async () => {
  const screen = await canvasPageOn();
  const before = await storedModels();
  const spot = paneSpot(screen.container, { x: 520, y: 420 });

  screen.getByLabelText('Add a virtual model').element().focus();
  await userEvent.keyboard('{Enter}');
  await pulledCable(await sourcePortOf(screen.container, 'draft'), spot);
  releasedAt(spot);
  await pickedTheTarget(screen);
  await expect.element(screen.getByText('Connected providers', { exact: true })).toBeVisible();

  await userEvent.click(paneOf(screen.container), { position: { x: 30, y: 30 } });

  await expect
    .element(screen.getByText('Connected providers', { exact: true }))
    .not.toBeInTheDocument();
  await expect.poll(() => screen.container.querySelector('[data-id="pending"]')).toBeNull();
  expect(await storedModels()).toEqual(before);
});

test('a pane press with the inspector already away leaves it away', async () => {
  const screen = await canvasPageOn();

  await userEvent.click(paneOf(screen.container), { position: { x: 30, y: 30 } });
  await expect.poll(() => screen.container.querySelector('aside')).toBeNull();

  await userEvent.click(paneOf(screen.container), { position: { x: 30, y: 30 } });

  await expect.poll(() => screen.container.querySelector('aside')).toBeNull();
});

test('Delete with nothing selected asks nothing and removes nothing', async () => {
  const screen = await canvasPageOn();
  const before = await storedModels();

  await userEvent.keyboard('{Delete}');

  await expect.element(screen.getByText(/Delete the/)).not.toBeInTheDocument();
  expect(await storedModels()).toEqual(before);
  expect(draftCardOn(screen.container)).toBeNull();
});

test('a dragged draft card keeps the seat the drag left it at', async () => {
  const screen = await canvasPageOn();

  screen.getByLabelText('Add a virtual model').element().focus();
  await userEvent.keyboard('{Enter}');
  await expect.poll(() => seatOf(screen.container, 'draft')).toBe('translate(320px, 352px)');

  draggedCard(cardWrapper(screen.container, 'draft'), { x: 40, y: 30 });

  await expect.poll(() => seatOf(screen.container, 'draft')).toBe('translate(360px, 382px)');
});

test('a dragged pending card carries the pick it stands for with it', async () => {
  const screen = await canvasPageOn();
  const letGo = { x: 520, y: 376 };
  const spot = paneSpot(screen.container, { x: 520, y: 420 });

  screen.getByLabelText('Add a virtual model').element().focus();
  await userEvent.keyboard('{Enter}');
  await pulledCable(await sourcePortOf(screen.container, 'draft'), spot);
  releasedAt(spot);
  await pickedTheTarget(screen);
  await expect.poll(() => cardCornerOn(screen.container, 'pending')).toEqual(letGo);

  draggedCard(cardWrapper(screen.container, 'pending'), { x: 40, y: 30 });

  await expect
    .poll(() => cardCornerOn(screen.container, 'pending'))
    .toEqual({ x: letGo.x + 40, y: letGo.y + 30 });
  await expect.element(screen.getByText('Connected providers', { exact: true })).toBeVisible();
});

test('tidying seats a dragged draft card back in its own column', async () => {
  standCanvasBridge();

  const pushCommand = canvasCommandLine();
  const screen = await renderCanvasPage();

  screen.getByLabelText('Add a virtual model').element().focus();
  await userEvent.keyboard('{Enter}');
  await expect.poll(() => seatOf(screen.container, 'draft')).toBe('translate(320px, 352px)');

  draggedCard(cardWrapper(screen.container, 'draft'), { x: 40, y: 30 });
  await expect.poll(() => seatOf(screen.container, 'draft')).toBe('translate(360px, 382px)');

  pushCommand('tidy');

  await expect.poll(() => seatOf(screen.container, 'draft')).toBe('translate(320px, 352px)');
});

test('tidying seats a pending card in the target column with the cards it waits beside', async () => {
  standCanvasBridge();

  const pushCommand = canvasCommandLine();
  const screen = await renderCanvasPage();
  const spot = paneSpot(screen.container, { x: 520, y: 420 });

  screen.getByLabelText('Add a virtual model').element().focus();
  await userEvent.keyboard('{Enter}');
  await pulledCable(await sourcePortOf(screen.container, 'draft'), spot);
  releasedAt(spot);
  await expect.poll(() => cardCornerOn(screen.container, 'pending')).toEqual({ x: 520, y: 376 });

  pushCommand('tidy');

  await expect
    .poll(() => columnOf(screen.container, 'pending'))
    .toBe(columnOf(screen.container, 'target:creative'));
  expect(seatOf(screen.container, 'pending')).not.toBe(seatOf(screen.container, 'target:creative'));

  await userEvent.keyboard('{Escape}');
  await expect.poll(() => screen.container.querySelector('[data-id="pending"]')).toBeNull();
});

test('Esc during a cable-endpoint drag rebinds nothing', async () => {
  seatedInsideThePane();

  const screen = await canvasPageOn();
  const before = await storedModels();

  await draggedCableOver(
    await reconnectAnchorOf(screen.container, 'cable:creative'),
    await targetPortOf(screen.container, 'target:fast'),
  );
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

  await expect.poll(() => document.querySelector('.react-flow__connectionline')).toBeNull();
  await expect.element(screen.getByText(/^Models .+ serves$/)).not.toBeInTheDocument();
  expect(await storedModels()).toEqual(before);
});

test('dragging a cable source endpoint onto another virtual model binds nothing', async () => {
  const screen = await canvasPageOn();
  const before = await storedModels();

  await draggedCable(
    await sourceAnchorOf(screen.container, 'cable:creative'),
    await sourcePortOf(screen.container, 'model:fast'),
  );

  await expect.element(screen.getByText(/^Models .+ serves$/)).not.toBeInTheDocument();
  expect(await storedModels()).toEqual(before);
});
