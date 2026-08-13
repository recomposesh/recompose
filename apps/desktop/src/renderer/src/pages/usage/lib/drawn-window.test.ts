import { describe, expect, test } from 'vitest';

import { drawnWith, settledDrawing } from './drawn-window';

function at(day: number, hours: number, minutes = 0): number {
  return new Date(2026, 7, day, hours, minutes, 0, 0).getTime();
}

function aSettledWindow() {
  return settledDrawing({ from: at(1, 9, 30), to: at(13, 17, 45) });
}

describe('drawing a window on the calendar', () => {
  test('the first day pressed opens a window of its own rather than moving an edge', () => {
    const drawn = drawnWith(aSettledWindow(), at(20, 0));

    expect(drawn.window).toEqual({ from: at(20, 9, 30), to: at(20, 17, 45) });
  });

  test('the day pressed after it closes the window there', () => {
    const drawn = drawnWith(drawnWith(aSettledWindow(), at(20, 0)), at(25, 0));

    expect(drawn.window).toEqual({ from: at(20, 9, 30), to: at(25, 17, 45) });
  });

  test('a day pressed behind the opening edge reopens the window there', () => {
    const drawn = drawnWith(drawnWith(aSettledWindow(), at(20, 0)), at(17, 0));

    expect(drawn.window).toEqual({ from: at(17, 9, 30), to: at(20, 17, 45) });
  });

  test('a third day pressed starts a window over again rather than widening the settled one', () => {
    const settled = drawnWith(drawnWith(aSettledWindow(), at(20, 0)), at(25, 0));

    const drawn = drawnWith(settled, at(28, 0));

    expect(drawn.window).toEqual({ from: at(28, 9, 30), to: at(28, 17, 45) });
  });

  test('pressing one day twice leaves the window standing over that day alone', () => {
    const drawn = drawnWith(drawnWith(aSettledWindow(), at(20, 0)), at(20, 0));

    expect(drawn.window).toEqual({ from: at(20, 9, 30), to: at(20, 17, 45) });
  });

  test('both edges keep the clock they already stood at', () => {
    const drawn = drawnWith(settledDrawing({ from: at(1, 0), to: at(2, 23, 59) }), at(9, 0));

    expect(drawn.window).toEqual({ from: at(9, 0), to: at(9, 23, 59) });
  });

  test('a window whose edges are typed the wrong way round still opens before it closes', () => {
    const drawn = drawnWith(settledDrawing({ from: at(1, 18), to: at(2, 6) }), at(9, 0));

    expect(drawn.window.from).toBeLessThanOrEqual(drawn.window.to);
  });
});
