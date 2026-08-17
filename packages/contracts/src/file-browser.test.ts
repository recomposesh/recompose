import { describe, expect, test } from 'vitest';

import { fileBrowserSchema, revealLabelFor } from './file-browser';

describe('the file-browser vocabulary', () => {
  test('the vocabulary is the three browsers the platforms ship, and nothing else', () => {
    expect(fileBrowserSchema.options).toEqual(['finder', 'explorer', 'file-manager']);
    expect(() => fileBrowserSchema.parse('nautilus')).toThrow();
  });
});

describe('the reveal action names the file browser the platform ships', () => {
  test('names Finder where the platform ships Finder', () => {
    expect(revealLabelFor('finder')).toBe('Reveal in Finder');
  });

  test('names Explorer where the platform ships Explorer', () => {
    expect(revealLabelFor('explorer')).toBe('Show in Explorer');
  });

  test('names neither where the platform ships its own file manager', () => {
    expect(revealLabelFor('file-manager')).toBe('Open folder');
  });
});
