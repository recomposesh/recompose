import { expect, test } from 'vitest';

import { keyPageFor } from './provider-catalog';

test('every coding plan says where its own vendor issues the key the plan is spent with', () => {
  for (const provider of ['zhipu', 'qwen-coding', 'minimax']) {
    const page = keyPageFor(provider);

    expect(page?.label).not.toBe('');
    expect(page?.href.startsWith('https://')).toBe(true);
  }
});

test('a provider whose key page the catalog never learned offers no link to guess at', () => {
  expect(keyPageFor('anthropic')).toBeUndefined();
  expect(keyPageFor('ollama')).toBeUndefined();
});
