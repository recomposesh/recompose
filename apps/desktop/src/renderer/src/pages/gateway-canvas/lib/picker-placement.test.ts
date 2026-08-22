import { describe, expect, test } from 'vitest';

import { pickerStandsAt, PICKER_WIDTH } from './picker-placement';

const pane = { width: 1280, height: 800 };
const settled = { x: 0, y: 0, zoom: 1 };

describe('where the picker panel stands over the pane', () => {
  test('a card with room to spare keeps its picker exactly on it', () => {
    expect(pickerStandsAt({ x: 400, y: 120 }, settled, pane)).toEqual({ x: 400, y: 120 });
  });

  test('a card near the far edge slides its picker back until the whole panel lands inside', () => {
    expect(pickerStandsAt({ x: 1200, y: 120 }, settled, pane)).toEqual({
      x: pane.width - PICKER_WIDTH,
      y: 120,
    });
  });

  test('the slide is measured at the zoom the person is looking through', () => {
    const zoomed = { x: 0, y: 0, zoom: 0.5 };

    expect(pickerStandsAt({ x: 2400, y: 0 }, zoomed, pane).x).toBe(pane.width - PICKER_WIDTH * 0.5);
  });

  test('a pane too narrow for the panel at all leaves it where the card is', () => {
    expect(pickerStandsAt({ x: 40, y: 0 }, settled, { width: 120, height: 400 }).x).toBe(40);
  });

  test('a panned canvas measures from where the card actually shows', () => {
    expect(pickerStandsAt({ x: 400, y: 100 }, { x: -150, y: -40, zoom: 1 }, pane)).toEqual({
      x: 250,
      y: 60,
    });
  });
});
