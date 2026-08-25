import { describe, expect, test } from 'vitest';

import { beatOf, SETUP_BEATS } from './setup-beat';

describe('the beats setup counts', () => {
  test('there are five, opening on harnesses and closing on the first request', () => {
    expect(SETUP_BEATS).toHaveLength(5);
    expect(SETUP_BEATS.at(0)).toBe('harnesses');
    expect(SETUP_BEATS.at(-1)).toBe('first request');
  });

  test('the welcome step counts as no beat, because it asks nothing', () => {
    expect(beatOf('welcome')).toBe(null);
  });

  test('composing and building stand on one beat, because they are one turn', () => {
    expect(beatOf('compose')).toBe('compose');
    expect(beatOf('building')).toBe('compose');
  });

  test('every beat a step stands on is one the count knows', () => {
    for (const step of [
      'harnesses',
      'sources',
      'compose',
      'building',
      'pointing',
      'waiting',
    ] as const) {
      expect(SETUP_BEATS).toContain(beatOf(step));
    }
  });
});
