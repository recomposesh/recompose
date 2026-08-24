import { describe, expect, test } from 'vitest';

import { chordLabelFor, shortcutKeySchema } from './shortcut-key';

describe('the shortcut-key vocabulary', () => {
  test('the vocabulary is the two modifiers the platforms name, and nothing else', () => {
    expect(shortcutKeySchema.options).toEqual(['command', 'control']);
    expect(() => shortcutKeySchema.parse('meta')).toThrow();
  });
});

describe('a chord hint names the modifier the platform holds', () => {
  test('prints the command glyph where the platform names Command', () => {
    expect(chordLabelFor('command', 'N')).toBe('⌘ N');
  });

  test('prints the control word where the platform names Control', () => {
    expect(chordLabelFor('control', 'N')).toBe('Ctrl N');
  });
});
