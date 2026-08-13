import { describe, expect, test } from 'vitest';

import { localLeadFor, localRuntimeName } from './local-catalog';

describe('what stands at the head of a local runtime row', () => {
  test('a runtime with a mark of its own shows that mark', () => {
    expect(localLeadFor('ollama')).toHaveProperty('mark');
  });

  test('a server a person addressed themselves shows a network glyph', () => {
    expect(localLeadFor('custom')).toEqual({ glyph: 'network' });
  });

  test('a project publishing no mark leads with its category glyph rather than borrowing one', () => {
    expect(localLeadFor('llamacpp')).toEqual({ glyph: 'monitor' });
  });
});

describe('the name a local row reads as', () => {
  test('a documented runtime reads as its own project spells it', () => {
    expect(localRuntimeName('ollama')).toBe('Ollama');
  });

  test('a server a person addressed themselves reads as whatever they called it', () => {
    expect(localRuntimeName('custom', 'Bench box')).toBe('Bench box');
  });

  test('a server they named nothing still reads as something', () => {
    expect(localRuntimeName('custom')).toBe('Local server');
  });
});
