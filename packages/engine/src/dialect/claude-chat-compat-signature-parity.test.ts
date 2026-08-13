import { describe, expect, it } from 'vitest';

import type { HubContentBlock, HubRequest } from './hub';

import { encodeRequest, encodeRequestWithoutCompat } from './chat-completions-request-encode';

describe('Claude reasoning crossing chat completions in compat mode', () => {
  it('should carry a thinking block whose signature belongs to another provider', () => {
    const encoded = encodeRequest(thinkingSigned('claude#opaque'));

    expect(encoded.value.messages.at(0)).toHaveProperty('reasoning_content', 'reason');
    expect(encoded.value.messages.at(0)).toHaveProperty('tool_calls');
  });

  it('should carry a thinking block whose signature is empty', () => {
    const encoded = encodeRequest(thinkingSigned(''));

    expect(encoded.value.messages.at(0)).toHaveProperty('reasoning_content', 'reason');
  });

  it('should carry a thinking block that never carried a signature at all', () => {
    const encoded = encodeRequest(thinkingUnsigned());

    expect(encoded.value.messages.at(0)).toHaveProperty('reasoning_content', 'reason');
  });

  it('should drop a foreign signature again once compat is off', () => {
    const encoded = encodeRequestWithoutCompat(thinkingSigned('claude#opaque'));

    expect(encoded.value.messages.at(0)).not.toHaveProperty('reasoning_content');
  });
});

function thinkingSigned(signature: string): HubRequest {
  return assistantTurn({ type: 'thinking', text: 'reason', signature });
}

function thinkingUnsigned(): HubRequest {
  return assistantTurn({ type: 'thinking', text: 'reason' });
}

function assistantTurn(thinking: HubContentBlock): HubRequest {
  return {
    sourceModel: 'claude-sonnet-4-5',
    messages: [
      {
        role: 'assistant',
        content: [thinking, { type: 'tool_use', id: 'call_1', name: 'Read', input: {} }],
      },
    ],
  };
}
