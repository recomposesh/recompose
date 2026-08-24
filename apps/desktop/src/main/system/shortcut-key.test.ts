import { describe, expect, test } from 'vitest';

import { shortcutKeyFor } from './shortcut-key';

describe('which modifier a platform holds its shortcuts under', () => {
  test('macOS holds them under Command', () => {
    expect(shortcutKeyFor('darwin')).toBe('command');
  });

  test('every other platform holds them under Control', () => {
    expect(shortcutKeyFor('win32')).toBe('control');
    expect(shortcutKeyFor('linux')).toBe('control');
  });
});
