import { beforeEach, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import { canvasPositions } from '../../lib/canvas-position-store';
import { keepCanvasViewport } from '../../lib/canvas-viewport-store';
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

const VIEWPORT_KEY = 'recompose.canvas.viewport.my-gateway';

function viewportTransform(container: HTMLElement): string {
  return container.querySelector<HTMLElement>('.react-flow__viewport')?.style.transform ?? '';
}

function keptViewport(): unknown {
  const kept: unknown = JSON.parse(localStorage.getItem(VIEWPORT_KEY) ?? '{}');

  return kept;
}

test('a first visit centers the composition rather than pinning it to the corner', async () => {
  standCanvasBridge();
  localStorage.removeItem(VIEWPORT_KEY);

  const screen = await renderCanvasPage();

  await expect.element(screen.getByRole('button', { name: /My Gateway/ })).toBeVisible();
  await expect
    .poll(() => viewportTransform(screen.container))
    .not.toBe('translate(48px, 48px) scale(1)');
});

test('the canvas opens where the person left its camera', async () => {
  standCanvasBridge();
  keepCanvasViewport('my-gateway', { x: -120, y: 32, zoom: 0.75 });

  const screen = await renderCanvasPage();

  await expect
    .poll(() => viewportTransform(screen.container))
    .toBe('translate(-120px, 32px) scale(0.75)');
});

test('a pan the person settles on is the camera the next visit opens with', async () => {
  const screen = await canvasPageOn();

  screen.container
    .querySelector('.react-flow__pane')
    ?.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaX: 60, deltaY: 40 }));

  await expect.poll(keptViewport).not.toEqual({ x: 48, y: 48, zoom: 1 });
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
