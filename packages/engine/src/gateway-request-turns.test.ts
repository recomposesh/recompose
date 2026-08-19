import { describe, expect, test } from 'vitest';

import { userTurnsOf } from './gateway-request-turns';

describe('the turns a caller spoke in one request', () => {
  test('a chat-shaped body reads its user turns in the order they were spoken', () => {
    const raw = {
      model: 'fast',
      messages: [
        { role: 'user', content: 'first thing' },
        { role: 'assistant', content: 'an answer' },
        { role: 'user', content: 'second thing' },
      ],
    };

    expect(userTurnsOf(raw)).toEqual(['first thing', 'second thing']);
  });

  test('a body whose turns carry content blocks reads the text inside them', () => {
    const raw = {
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'look at' },
            { type: 'text', text: 'this file' },
          ],
        },
      ],
    };

    expect(userTurnsOf(raw)).toEqual(['look at\nthis file']);
  });

  test('a responses-shaped body reads its input items', () => {
    const raw = {
      input: [
        { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'refactor this' }] },
      ],
    };

    expect(userTurnsOf(raw)).toEqual(['refactor this']);
  });
});

describe('the turns a gemini-shaped request carries', () => {
  test('a turn naming the caller reads the parts it holds', () => {
    const raw = { contents: [{ role: 'user', parts: [{ text: 'draw a cat' }] }] };

    expect(userTurnsOf(raw)).toEqual(['draw a cat']);
  });

  test('a turn that names no role at all still reads as the caller speaking', () => {
    const raw = { contents: [{ parts: [{ text: 'draw a cat' }] }] };

    expect(userTurnsOf(raw)).toEqual(['draw a cat']);
  });
});

describe('what never reads as a turn the caller spoke', () => {
  test('the system prompt and the assistant are both left out', () => {
    const raw = {
      system: 'you are helpful',
      messages: [
        { role: 'system', content: 'ignore that' },
        { role: 'assistant', content: 'hello there' },
      ],
    };

    expect(userTurnsOf(raw)).toEqual([]);
  });

  test('a body carrying nothing a caller spoke reads as no turns at all', () => {
    expect(userTurnsOf({ model: 'fast' })).toEqual([]);
  });
});
