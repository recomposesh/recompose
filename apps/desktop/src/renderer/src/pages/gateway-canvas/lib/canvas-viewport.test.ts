import { describe, expect, test } from 'vitest';

import { flowPointOf, RESTING_VIEWPORT, viewportOf } from './canvas-viewport';

describe('where a point on the pane stands in the flow', () => {
  test('a pane point on a canvas nobody moved stands the pan away from the flow', () => {
    expect(flowPointOf({ x: 320, y: 200 }, { x: 48, y: 48, zoom: 1 })).toEqual({
      x: 272,
      y: 152,
    });
  });

  test('a pane point on a panned canvas answers where the person is looking', () => {
    expect(flowPointOf({ x: 320, y: 200 }, { x: -160, y: -90, zoom: 1 })).toEqual({
      x: 480,
      y: 290,
    });
  });

  test('a pane point on a zoomed canvas answers in the flow measure rather than the pane one', () => {
    expect(flowPointOf({ x: 320, y: 200 }, { x: 40, y: 20, zoom: 2 })).toEqual({ x: 140, y: 90 });
  });

  test('the flow origin reads back as the pane point the viewport puts it at', () => {
    expect(flowPointOf({ x: 48, y: 48 }, { x: 48, y: 48, zoom: 1.5 })).toEqual({ x: 0, y: 0 });
  });
});

describe('the viewport a gesture reads the canvas through', () => {
  test('a standing flow answers with what it is showing', () => {
    const showing = { x: -200, y: 60, zoom: 0.75 };

    expect(viewportOf({ getViewport: () => showing })).toEqual(showing);
  });

  test('a flow that has not mounted yet answers with the resting canvas', () => {
    expect(viewportOf(null)).toEqual(RESTING_VIEWPORT);
  });
});
