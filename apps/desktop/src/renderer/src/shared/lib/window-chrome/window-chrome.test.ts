import { describe, expect, test } from 'vitest';

import {
  bandAlignmentFor,
  bandLeadInsetFor,
  barLeadInsetFor,
  barStandsFor,
  barTailInsetFor,
} from './window-chrome';

describe('how the sidebar band spreads what it carries', () => {
  test('to both edges, wherever the band carries the brand the hidden bar took away', () => {
    expect(bandAlignmentFor('leading')).toBe('justify-between');
    expect(bandAlignmentFor('trailing')).toBe('justify-between');
  });

  test('everything to the leading edge, where the platform draws its own title bar', () => {
    expect(bandAlignmentFor('none')).toBe('justify-start');
  });
});

describe('how far the sidebar band holds its brand off the leading edge', () => {
  test('past the window controls floating over that corner', () => {
    expect(bandLeadInsetFor('leading')).toBe('ps-window-controls-width');
  });

  test('the ordinary inset wherever nothing floats over it', () => {
    expect(bandLeadInsetFor('trailing')).toBe('ps-1');
    expect(bandLeadInsetFor('none')).toBe('ps-1');
  });
});

describe('how far a bar holds its acts off the leading edge', () => {
  test('past the controls floating there once the sidebar has gone', () => {
    expect(barLeadInsetFor('leading', true)).toBe('ps-window-controls-width');
  });

  test('the ordinary inset while the sidebar still covers them', () => {
    expect(barLeadInsetFor('leading', false)).toBe('ps-3.5');
  });

  test('the ordinary inset wherever the controls take the other edge', () => {
    expect(barLeadInsetFor('trailing', true)).toBe('ps-3.5');
    expect(barLeadInsetFor('none', true)).toBe('ps-3.5');
  });
});

describe('how far a bar holds its acts off the trailing edge', () => {
  test('past the caption buttons standing there', () => {
    expect(barTailInsetFor('trailing')).toBe('pe-window-caption');
  });

  test('the ordinary inset wherever nothing floats over that edge', () => {
    expect(barTailInsetFor('leading')).toBe('pe-3.5');
    expect(barTailInsetFor('none')).toBe('pe-3.5');
  });
});

describe('whether a surface holding no gateway paints its bar', () => {
  test('it paints once the sidebar has gone and the bar carries the only control left', () => {
    expect(barStandsFor('leading', true)).toBe(true);
    expect(barStandsFor('none', true)).toBe(true);
  });

  test('it paints nothing while the sidebar carries that control', () => {
    expect(barStandsFor('leading', false)).toBe(false);
    expect(barStandsFor('none', false)).toBe(false);
  });

  test('it always paints where the caption buttons stand on it', () => {
    expect(barStandsFor('trailing', false)).toBe(true);
    expect(barStandsFor('trailing', true)).toBe(true);
  });
});
