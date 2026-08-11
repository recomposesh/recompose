import { beforeEach, expect, test } from 'vitest';

import { canvasViewport, dropCanvasViewport, keepCanvasViewport } from './canvas-viewport-store';

const KEY = 'recompose.canvas.viewport.my-gateway';

beforeEach(() => {
  localStorage.clear();
});

test('a canvas nobody left holds no viewport', () => {
  expect(canvasViewport('my-gateway')).toBeUndefined();
});

test('the viewport a person left comes back for the same gateway', () => {
  keepCanvasViewport('my-gateway', { x: 20, y: 30, zoom: 1.5 });

  expect(canvasViewport('my-gateway')).toEqual({ x: 20, y: 30, zoom: 1.5 });
});

test('a written value that is not JSON reads as a first visit', () => {
  localStorage.setItem(KEY, 'not even json');

  expect(canvasViewport('my-gateway')).toBeUndefined();
});

test('a written value missing an axis reads as a first visit', () => {
  localStorage.setItem(KEY, JSON.stringify({ x: 20, y: 30 }));

  expect(canvasViewport('my-gateway')).toBeUndefined();
});

test('a written value that holds no axes at all reads as a first visit', () => {
  localStorage.setItem(KEY, JSON.stringify('somewhere nice'));

  expect(canvasViewport('my-gateway')).toBeUndefined();
});

test('a viewport with an axis that is not a number reads as a first visit', () => {
  localStorage.setItem(KEY, JSON.stringify({ x: 'left', y: 30, zoom: 1 }));

  expect(canvasViewport('my-gateway')).toBeUndefined();
});

test('a viewport whose zoom could draw nothing reads as a first visit', () => {
  localStorage.setItem(KEY, JSON.stringify({ x: 20, y: 30, zoom: 0 }));

  expect(canvasViewport('my-gateway')).toBeUndefined();
});

test('dropping the viewport forgets where the canvas stood', () => {
  keepCanvasViewport('my-gateway', { x: 20, y: 30, zoom: 1.5 });
  dropCanvasViewport('my-gateway');

  expect(canvasViewport('my-gateway')).toBeUndefined();
});
