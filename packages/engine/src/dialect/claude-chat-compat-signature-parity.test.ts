import { describe, expect, it } from 'vitest';

import type { HubRequest } from './hub';

import { encodeRequest, encodeRequestWithoutCompat } from './chat-completions-request-encode';

describe('Claude reasoning crossing chat completions in compat mode', () => {
  it('should carry a thinking block whose signature belongs to another provider', () => {
    const encoded = encodeRequest(thinkingSigned('claude#opaque'));

    expect(encoded.value.messages.at(0)).toHaveProperty('reasoning_content', 'reason');
    expect(encoded.value.messages.at(0)).toHaveProperty('tool_calls');
  });

  it('should carry a thinking block that never carried a signature', () => {
    const encoded = encodeRequest(thinkingSigned(''));

    expect(encoded.value.messages.at(0)).toHaveProperty('reasoning_content', 'reason');
  });

  it('should drop a foreign signature again once compat is off', () => {
    const encoded = encodeRequestWithoutCompat(thinkingSigned('claude#opaque'));

    expect(encoded.value.messages.at(0)).not.toHaveProperty('reasoning_content');
  });
});

function thinkingSigned(signature: string): HubRequest {
  return {
    sourceModel: 'claude-sonnet-4-5',
    messages: [
      {
        role: 'assistant',
        content: [
          { type: 'thinking', text: 'reason', signature },
          { type: 'tool_use', id: 'call_1', name: 'Read', input: {} },
        ],
      },
    ],
  };
}
