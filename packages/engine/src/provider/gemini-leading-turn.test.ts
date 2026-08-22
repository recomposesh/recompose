import { describe, expect, test } from 'vitest';

import { geminiTurnsUpstreamWillTake } from './gemini-leading-turn';

describe('a conversation reaching Gemini on the model’s own turn', () => {
  test('an empty turn stands in front of it, since Gemini answers no model-first request', () => {
    const body = geminiTurnsUpstreamWillTake({
      contents: [{ role: 'model', parts: [{ text: 'carried over' }] }],
    });

    expect(body['contents']).toEqual([
      { role: 'user', parts: [{ text: '' }] },
      { role: 'model', parts: [{ text: 'carried over' }] },
    ]);
  });

  test('a conversation the person opened reaches upstream exactly as it stands', () => {
    const contents = [{ role: 'user', parts: [{ text: 'hello' }] }];

    expect(geminiTurnsUpstreamWillTake({ contents })['contents']).toBe(contents);
  });

  test('a body carrying no turns gains none', () => {
    expect(geminiTurnsUpstreamWillTake({ contents: [] })['contents']).toEqual([]);
  });

  test('a body that names no turns at all is left alone', () => {
    const body = { model: 'gemini-3-pro-preview' };

    expect(geminiTurnsUpstreamWillTake(body)).toBe(body);
  });
});
