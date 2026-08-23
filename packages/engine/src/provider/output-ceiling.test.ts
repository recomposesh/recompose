import { describe, expect, test } from 'vitest';

import { cappedOutput } from './output-ceiling';

describe('the output a target model will take', () => {
  test('an ask above the ceiling is brought down to it', () => {
    expect(cappedOutput({ max_tokens: 64_000 }, 16_384)).toEqual({ max_tokens: 16_384 });
  });

  test('an ask the model would have finished is left alone', () => {
    expect(cappedOutput({ max_tokens: 4_000 }, 16_384)).toEqual({ max_tokens: 4_000 });
  });

  test('the modern field is capped the same way as the one it replaced', () => {
    expect(cappedOutput({ max_completion_tokens: 64_000 }, 8_192)).toEqual({
      max_completion_tokens: 8_192,
    });
  });

  test('a vendor that stated no ceiling leaves the turn as the caller wrote it', () => {
    const body = { max_tokens: 64_000 };

    expect(cappedOutput(body, undefined)).toBe(body);
  });

  test('a turn asking for no ceiling of its own carries none', () => {
    expect(cappedOutput({ messages: [] }, 8_192)).toEqual({ messages: [] });
  });

  test('every other field of the turn survives the cap', () => {
    expect(cappedOutput({ model: 'x', max_tokens: 99_999, temperature: 0.2 }, 8_192)).toEqual({
      model: 'x',
      max_tokens: 8_192,
      temperature: 0.2,
    });
  });
});
