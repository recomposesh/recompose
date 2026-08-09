import { beforeEach, expect, test } from 'vitest';

import {
  canvasPositions,
  dropCanvasPositions,
  keepCanvasPositions,
  setNodePosition,
  subscribeToCanvasPositions,
} from './canvas-position-store';

const KEY = 'recompose.canvas.positions.my-gateway';

beforeEach(() => {
  localStorage.clear();
  dropCanvasPositions('my-gateway');
});

test('a canvas nobody arranged holds no positions', () => {
  expect(canvasPositions('my-gateway')).toEqual({});
});

test('a drag in flight moves the seat without writing it down', () => {
  setNodePosition('my-gateway', 'model:fast', { x: 320, y: 140 });

  expect(canvasPositions('my-gateway')).toEqual({ 'model:fast': { x: 320, y: 140 } });
  expect(localStorage.getItem(KEY)).toBeNull();
});

test('a settled drag writes the arrangement under the gateway key', () => {
  setNodePosition('my-gateway', 'model:fast', { x: 320, y: 140 });
  keepCanvasPositions('my-gateway');

  expect(localStorage.getItem(KEY)).toBe(JSON.stringify({ 'model:fast': { x: 320, y: 140 } }));
});

test('the written arrangement comes back for the same gateway', () => {
  localStorage.setItem(KEY, JSON.stringify({ gateway: { x: 12, y: 34 } }));

  expect(canvasPositions('my-gateway')).toEqual({ gateway: { x: 12, y: 34 } });
});

test('a malformed written value reads as no arrangement at all', () => {
  localStorage.setItem(KEY, '{"gateway": "not a seat"}');

  expect(canvasPositions('my-gateway')).toEqual({});
});

test('two gateways keep their arrangements apart', () => {
  setNodePosition('my-gateway', 'gateway', { x: 1, y: 2 });

  expect(canvasPositions('other-gateway')).toEqual({});
});

test('dropping the arrangement clears the memory and the written value', () => {
  setNodePosition('my-gateway', 'gateway', { x: 1, y: 2 });
  keepCanvasPositions('my-gateway');
  dropCanvasPositions('my-gateway');

  expect(canvasPositions('my-gateway')).toEqual({});
  expect(localStorage.getItem(KEY)).toBeNull();
});

test('readers hear about every seat change', () => {
  const heard: string[] = [];
  const letGo = subscribeToCanvasPositions(() => {
    heard.push('changed');
  });

  setNodePosition('my-gateway', 'gateway', { x: 1, y: 2 });
  dropCanvasPositions('my-gateway');
  letGo();
  setNodePosition('my-gateway', 'gateway', { x: 3, y: 4 });

  expect(heard).toEqual(['changed', 'changed']);
});

test('the reading keeps its identity until a seat actually moves', () => {
  setNodePosition('my-gateway', 'gateway', { x: 1, y: 2 });

  const first = canvasPositions('my-gateway');

  expect(canvasPositions('my-gateway')).toBe(first);
});
