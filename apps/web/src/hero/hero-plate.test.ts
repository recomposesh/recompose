import { describe, expect, it } from 'vitest';

import { type PlateInput, choosePlate } from './hero-plate';

const input = (overrides: Partial<PlateInput> = {}): PlateInput => ({
  stillness: false,
  loopReady: true,
  playbackRefused: false,
  ...overrides,
});

describe('the hero decides what the reveal uncovers', () => {
  it('uncovers the loop once it has arrived', () => {
    expect(choosePlate(input())).toBe('loop');
  });

  it('holds the still frame until the loop arrives, so the reveal has something to show', () => {
    expect(choosePlate(input({ loopReady: false }))).toBe('poster');
  });

  it('holds the still frame when the browser refuses to play', () => {
    expect(choosePlate(input({ playbackRefused: true }))).toBe('poster');
  });

  it('holds the still frame for a person who asked for reduced motion', () => {
    expect(choosePlate(input({ stillness: true }))).toBe('poster');
  });

  it('drops back to the still frame when stillness arrives mid-visit', () => {
    const playing = choosePlate(input());
    const stilled = choosePlate(input({ stillness: true }));

    expect(playing).toBe('loop');
    expect(stilled).toBe('poster');
  });
});
