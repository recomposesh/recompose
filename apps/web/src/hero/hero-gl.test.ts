import { describe, expect, it } from 'vitest';

import { trailSize } from './hero-gl';

describe('the trail buffer measures itself in whole pixels', () => {
  it('rounds a width the scale cannot divide, so the shader reads the size it drew', () => {
    expect(Number.isInteger(trailSize(2625))).toBe(true);
  });

  it('keeps the buffer at two pixels when the canvas is smaller than the scale', () => {
    expect(trailSize(3)).toBe(2);
  });

  it('divides an exact width exactly', () => {
    expect(trailSize(800)).toBe(200);
  });
});
