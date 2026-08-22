import { describe, expect, test } from 'vitest';

import type { ChatCompletionsResponse, ChatResponseMessage } from './chat-completions-wire';

import { decodeResponse } from './chat-completions-response';

function answeredWith(
  message: Partial<Pick<ChatResponseMessage, 'reasoning' | 'reasoning_content'>>,
): ChatCompletionsResponse {
  return {
    id: 'chatcmpl-1',
    model: 'k3',
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content: 'done', ...message },
        finish_reason: 'stop',
      },
    ],
  };
}

describe('what a chat-completions answer says it was thinking', () => {
  test('the thought reaches the hub ahead of the text it produced', () => {
    const { value } = decodeResponse(answeredWith({ reasoning_content: 'weighed both' }));

    expect(value.content).toEqual([
      { type: 'thinking', text: 'weighed both', signature: '' },
      { type: 'text', text: 'done' },
    ]);
  });

  test('a vendor spelling it `reasoning` is read the same way', () => {
    const { value } = decodeResponse(answeredWith({ reasoning: 'weighed both' }));

    expect(value.content).toEqual([
      { type: 'thinking', text: 'weighed both', signature: '' },
      { type: 'text', text: 'done' },
    ]);
  });

  test('the documented spelling wins where a vendor sends both', () => {
    const { value } = decodeResponse(
      answeredWith({ reasoning_content: 'documented', reasoning: 'fallback' }),
    );

    expect(value.content[0]).toEqual({ type: 'thinking', text: 'documented', signature: '' });
  });

  test('an answer that thought about nothing carries no thinking block', () => {
    const { value } = decodeResponse(answeredWith({ reasoning_content: '' }));

    expect(value.content).toEqual([{ type: 'text', text: 'done' }]);
  });
});
