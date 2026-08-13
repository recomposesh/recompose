import { describe, expect, test } from 'vitest';

import { localLeadFor } from './local-catalog';

describe('what stands at the head of a local runtime row', () => {
  test('a runtime with a mark of its own shows that mark', () => {
    expect(localLeadFor('ollama')).toHaveProperty('mark');
  });

  test('a server a person addressed themselves shows a network glyph', () => {
    expect(localLeadFor('custom')).toEqual({ glyph: 'network' });
  });
});
