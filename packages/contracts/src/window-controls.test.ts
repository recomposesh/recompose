import { describe, expect, test } from 'vitest';

import { windowControlsSchema } from './window-controls';

describe('the window-controls vocabulary', () => {
  test('the vocabulary is the two edges controls take and the absence of both, and nothing else', () => {
    expect(windowControlsSchema.options).toEqual(['leading', 'trailing', 'none']);
    expect(() => windowControlsSchema.parse('win32')).toThrow();
  });
});
