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
  await expect.poll(() => seatOf(screen.container, 'target:k1')).toBe('translate(640px, 0px)');
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
