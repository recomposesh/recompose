import { describe, expect, test } from 'vitest';

import { continueReads, togglePicked } from './picked-count';

describe('the control that continues a step', () => {
  test('it reads plainly while nothing stands picked', () => {
    expect(continueReads(0, 'harness')).toBe('Continue');
  });

  test('it counts one in the singular', () => {
    expect(continueReads(1, 'harness')).toBe('Continue with 1 harness');
    expect(continueReads(1, 'source')).toBe('Continue with 1 source');
  });

  test('it counts more than one in the plural', () => {
    expect(continueReads(2, 'harness')).toBe('Continue with 2 harnesses');
    expect(continueReads(3, 'source')).toBe('Continue with 3 sources');
  });
});

describe('picking and unpicking', () => {
  test('picking something new adds it', () => {
    expect([...togglePicked(new Set(['claude-code']), 'cursor')]).toEqual([
      'claude-code',
      'cursor',
    ]);
  });

  test('picking something already picked takes it back out', () => {
    expect([...togglePicked(new Set(['claude-code', 'cursor']), 'cursor')]).toEqual([
      'claude-code',
    ]);
  });

  test('the set it was handed is left alone', () => {
    const picked = new Set(['claude-code']);

    togglePicked(picked, 'cursor');

    expect([...picked]).toEqual(['claude-code']);
  });
});
