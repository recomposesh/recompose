import { describe, expect, test } from 'vitest';

import { cappedGeminiOutput } from './gemini-model-limits';

describe('the output a Gemini model will take', () => {
  test('an ask above the stated ceiling is brought down to it', () => {
    expect(cappedGeminiOutput({ generationConfig: { maxOutputTokens: 500_000 } }, 65_536)).toEqual({
      generationConfig: { maxOutputTokens: 65_536 },
    });
  });

  test('an ask the model would have finished is left alone', () => {
    expect(cappedGeminiOutput({ generationConfig: { maxOutputTokens: 1_024 } }, 65_536)).toEqual({
      generationConfig: { maxOutputTokens: 1_024 },
    });
  });

  test('a model the vendor stated no ceiling for goes out as the caller wrote it', () => {
    const body = { generationConfig: { maxOutputTokens: 500_000 } };

    expect(cappedGeminiOutput(body, undefined)).toBe(body);
  });

  test('a turn carrying no generation config is untouched', () => {
    const body = { contents: [] };

    expect(cappedGeminiOutput(body, 65_536)).toBe(body);
  });

  test('every other generation setting survives the cap', () => {
    expect(
      cappedGeminiOutput(
        { generationConfig: { maxOutputTokens: 500_000, temperature: 0.2 } },
        65_536,
      ),
    ).toEqual({ generationConfig: { maxOutputTokens: 65_536, temperature: 0.2 } });
  });

  test('a config asking for no ceiling of its own carries none', () => {
    const body = { generationConfig: { temperature: 0.2 } };

    expect(cappedGeminiOutput(body, 65_536)).toBe(body);
  });
});
