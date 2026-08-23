import { describe, expect, test } from 'vitest';

import { readerKeyAskFor } from './provider-catalog';

describe('the read-only key a provider needs before it will report a balance', () => {
  test('OpenRouter asks for one, because its credits endpoint refuses the key it serves with', () => {
    expect(readerKeyAskFor('openrouter')).toEqual({
      label: 'Management key',
      hint: 'sk-or-v1-…',
      note: 'Optional. OpenRouter reads credits only with a management key, and this one never serves a request.',
    });
  });

  test('a provider that reports a balance to its own key asks for nothing', () => {
    expect(readerKeyAskFor('deepseek')).toBeUndefined();
  });

  test('a provider nobody reads a balance from asks for nothing either', () => {
    expect(readerKeyAskFor('groq')).toBeUndefined();
  });
});
