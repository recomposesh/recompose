import { beforeEach, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import { canvasPositions } from '../../lib/canvas-position-store';
import { draggedCard } from '../../testing/canvas-gestures.testkit';
import {
  canvasCommandLine,
  canvasPageOn,
  freshCanvasRun,
  renderCanvasPage,
  standCanvasBridge,
} from '../../testing/canvas-page.testkit';

vi.setConfig({ testTimeout: 40_000 });

beforeEach(freshCanvasRun);

const POSITIONS_KEY = 'recompose.canvas.positions.my-gateway';

function viewportTransform(container: HTMLElement): string {
  return container.querySelector<HTMLElement>('.react-flow__viewport')?.style.transform ?? '';
}

/**
 * Whether every card the canvas drew paints inside the pane rather than off one of its edges.
 *
 * @operation The reading comes from the painted boxes rather than from the viewport numbers, since
 * what a person complains about is a card they cannot see, not a transform they cannot read. A pane
 * the browser has not measured yet answers false, so a poll waits for the canvas instead of passing
 * on a canvas that has not drawn.
 */
function everyCardStandsInThePane(container: HTMLElement): boolean {
  const pane = container.querySelector('.react-flow')?.getBoundingClientRect();
  const cards = [...container.querySelectorAll('.react-flow__node')];

  if (pane === undefined || pane.width === 0 || cards.length === 0) {
    return false;
  }

  return cards.every((card) => {
    const at = card.getBoundingClientRect();

    return at.left >= pane.left && at.right <= pane.right;
  });
}

test('a first visit centers the composition rather than pinning it to the corner', async () => {
  standCanvasBridge();

  const screen = await renderCanvasPage();

  await expect.element(screen.getByRole('button', { name: /My Gateway/ })).toBeVisible();
  await expect
    .poll(() => viewportTransform(screen.container))
    .not.toBe('translate(48px, 48px) scale(1)');
});

/**
 * A camera left somewhere is a camera a person can lose the composition behind. Panning far and
 * closing the gateway used to strand the next visit on empty canvas with no way back, so opening
 * one fits what it holds rather than restoring where anybody last happened to be looking.
 */
test('a pan a person leaves the canvas on is remembered nowhere', async () => {
  const screen = await canvasPageOn();

  screen.container
    .querySelector('.react-flow__pane')
    ?.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaX: 60, deltaY: 40 }));

  await expect.element(screen.getByRole('button', { name: /My Gateway/ })).toBeVisible();
  expect(Object.keys(localStorage).filter((key) => key.includes('viewport'))).toEqual([]);
});

test('a born gateway opens with its one card whole in the pane, not half off the edge', async () => {
  standCanvasBridge();

  const screen = await renderCanvasPage();

  await expect.element(screen.getByRole('button', { name: /My Gateway/ })).toBeVisible();
  await expect.poll(() => everyCardStandsInThePane(screen.container)).toBe(true);
});

function cardWrapper(container: HTMLElement, nodeId: string): HTMLElement | null {
  return container.querySelector<HTMLElement>(`.react-flow__node[data-id="${nodeId}"]`);
}

function seatOf(container: HTMLElement, nodeId: string): string {
  return cardWrapper(container, nodeId)?.style.transform ?? '';
}

test('every card seats where tidy puts it on a canvas nobody arranged', async () => {
  const screen = await canvasPageOn();

  await expect.poll(() => seatOf(screen.container, 'gateway')).toBe('translate(0px, 0px)');
  await expect.poll(() => seatOf(screen.container, 'model:fast')).toBe('translate(320px, 0px)');
  await expect.poll(() => seatOf(screen.container, 'target:fast')).toBe('translate(640px, 0px)');
});

test('a malformed written arrangement falls back to the tidy seats', async () => {
  localStorage.setItem(POSITIONS_KEY, '{"gateway": "somewhere"}');

  const screen = await canvasPageOn();

  await expect.poll(() => seatOf(screen.container, 'gateway')).toBe('translate(0px, 0px)');
});

test('a dragged card keeps its seat, and the arrangement is written down settled', async () => {
  const screen = await canvasPageOn();

  await expect.poll(() => seatOf(screen.container, 'model:fast')).toBe('translate(320px, 0px)');
  draggedCard(cardWrapper(screen.container, 'model:fast'), { x: 40, y: 30 });

  await expect.poll(() => seatOf(screen.container, 'model:fast')).toBe('translate(360px, 30px)');
  expect(localStorage.getItem(POSITIONS_KEY)).toContain('"model:fast"');
});

test('the arrangement written down comes back on the next visit', async () => {
  localStorage.setItem(POSITIONS_KEY, JSON.stringify({ 'model:fast': { x: 500, y: 90 } }));

  const screen = await canvasPageOn();

  await expect.poll(() => seatOf(screen.container, 'model:fast')).toBe('translate(500px, 90px)');
});

test('mounting and selecting write no seat, because a foreign change changes nothing', async () => {
  const screen = await canvasPageOn();

  await userEvent.click(screen.getByRole('button', { name: /Fast/ }));

  expect(canvasPositions('my-gateway')).toEqual({});
  expect(localStorage.getItem(POSITIONS_KEY)).toBeNull();
});

test('the tidy command drops the arrangement and reseats every card', async () => {
  standCanvasBridge();

  const pushCommand = canvasCommandLine();
  const screen = await renderCanvasPage();

  await expect.poll(() => seatOf(screen.container, 'model:fast')).toBe('translate(320px, 0px)');
  draggedCard(cardWrapper(screen.container, 'model:fast'), { x: 40, y: 30 });
  await expect.poll(() => seatOf(screen.container, 'model:fast')).toBe('translate(360px, 30px)');

  pushCommand('tidy');

  await expect.poll(() => seatOf(screen.container, 'model:fast')).toBe('translate(320px, 0px)');
  expect(localStorage.getItem(POSITIONS_KEY)).toBeNull();
});

test('tidying brings the whole composition back into the pane', async () => {
  standCanvasBridge();

  const pushCommand = canvasCommandLine();
  const screen = await renderCanvasPage();

  await expect.poll(() => everyCardStandsInThePane(screen.container)).toBe(true);

  pushCommand('zoom-in');
  pushCommand('zoom-in');
  pushCommand('zoom-in');
  pushCommand('zoom-in');

  await expect.poll(() => everyCardStandsInThePane(screen.container)).toBe(false);

  pushCommand('tidy');

  await expect.poll(() => everyCardStandsInThePane(screen.container)).toBe(true);
});

test('the zoom command reaches the viewport through the menu line', async () => {
  standCanvasBridge();

  const pushCommand = canvasCommandLine();
  const screen = await renderCanvasPage();
  const viewport = () =>
    screen.container.querySelector<HTMLElement>('.react-flow__viewport')?.style.transform ?? '';

  await expect.poll(() => viewport()).not.toBe('');

  const resting = viewport();

  pushCommand('zoom-in');

  await expect.poll(() => viewport()).not.toBe(resting);
});

test('the canvas mounts under StrictMode with a console clear of warnings', async () => {
  const warned = vi.spyOn(console, 'warn');
  const erred = vi.spyOn(console, 'error');

  const screen = await canvasPageOn({}, true);

  await expect.element(screen.getByRole('button', { name: /Fast/ })).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: /Fast/ }));

  expect(warned).not.toHaveBeenCalled();
  expect(erred).not.toHaveBeenCalled();
  warned.mockRestore();
  erred.mockRestore();
});

/**
 * Every cable the canvas holds stays drawn once a card moves to a new seat.
 *
 * @operation The reading waits for the card to reach its new seat rather than taking the count
 * straight after the gesture, because the arrangement lands a frame later and a count read too
 * early agrees with a canvas whose cables have not been dropped yet.
 */
test('moving a card leaves every cable it holds drawn on the canvas', async () => {
  const screen = await canvasPageOn();
  const cablesDrawn = () => screen.container.querySelectorAll('.react-flow__edge').length;

  await expect.poll(cablesDrawn).toBeGreaterThan(0);

  const before = cablesDrawn();

  draggedCard(cardWrapper(screen.container, 'model:fast'), { x: 40, y: 30 });

  await expect.poll(() => seatOf(screen.container, 'model:fast')).toBe('translate(360px, 30px)');
  expect(cablesDrawn()).toBe(before);
});
