import { describe, expect, it } from 'vitest';

import { noteLetters } from './note-letters';

describe('a nav label reads as a bar of music', () => {
  it('gives every letter its own note', () => {
    expect(noteLetters('docs').map((note) => note.letter)).toStrictEqual(['d', 'o', 'c', 's']);
  });

  it('turns a b into a flat and a d into a notehead, and leaves the rest alone', () => {
    expect(noteLetters('bad').map((note) => note.kind)).toStrictEqual([
      'flat',
      'plain',
      'notehead',
    ]);
  });

  it('starts each letter after the one before, so the label lifts as a run', () => {
    const staggers = noteLetters('docs').map((note) => note.staggerMs);

    expect(staggers).toStrictEqual([...staggers].sort((a, b) => a - b));
    expect(new Set(staggers).size).toBe(staggers.length);
  });

  it('shifts the same label the same way every time, because the page is prerendered', () => {
    expect(noteLetters('changelog')).toStrictEqual(noteLetters('changelog'));
  });

  it('shifts letters both above and below the line, so the run reads as a melody', () => {
    const shifts = noteLetters('changelog').map((note) => note.shiftPx);

    expect(Math.min(...shifts)).toBeLessThan(0);
    expect(Math.max(...shifts)).toBeGreaterThan(0);
  });

  it('keeps every shift inside the staff', () => {
    for (const note of noteLetters('recompose gateways')) {
      expect(Math.abs(note.shiftPx)).toBeLessThanOrEqual(2);
    }
  });
});
