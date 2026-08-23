import { expect, test } from 'vitest';

import { keyShapeHintFor } from './provider-catalog';

test('a key field hints at the shape the provider hands out', () => {
  expect(keyShapeHintFor('anthropic')).toBe('sk-ant-…');
  expect(keyShapeHintFor('openai')).toBe('sk-proj-…');
});

test('the aggregator field hints at the one shape its vendor documents', () => {
  expect(keyShapeHintFor('openrouter')).toBe('sk-or-v1-…');
});

test('a provider whose key shape the catalog never learned hints at nothing', () => {
  expect(keyShapeHintFor('ollama')).toBeUndefined();
  expect(keyShapeHintFor('mistral')).toBeUndefined();
});
