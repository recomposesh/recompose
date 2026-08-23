import { describe, expect, test } from 'vitest';

import { createGatewayApp } from './gateway-app';
import { aCredentialedGrant, aGatewayHolding, aVirtualModel } from './gateway-app.testkit';

const grant = aCredentialedGrant('https://generativelanguage.googleapis.com', 'gemini');

function geminiStreamOf(...texts: readonly string[]): Response {
  const frames = texts.map((text, at) => ({
    candidates: [
      {
        content: { role: 'model', parts: [{ text }] },
        ...(at === texts.length - 1 ? { finishReason: 'STOP' } : {}),
      },
    ],
    ...(at === texts.length - 1 ? { usageMetadata: { promptTokenCount: 3 } } : {}),
  }));

  return new Response(frames.map((frame) => `data: ${JSON.stringify(frame)}\n\n`).join(''), {
    headers: { 'content-type': 'text/event-stream' },
  });
}

async function streamedThrough(dialect: 'anthropic' | 'chat-completions', ...texts: string[]) {
  const app = createGatewayApp(
    aGatewayHolding(aVirtualModel()),
    async () => Promise.resolve(grant),
    async () => Promise.resolve(geminiStreamOf(...texts)),
  );
  const path = dialect === 'anthropic' ? '/v1/messages' : '/v1/chat/completions';
  const answer = await app.request(`http://127.0.0.1:8397${path}`, {
    method: 'POST',
    body: JSON.stringify({
      model: 'fast',
      max_tokens: 64,
      messages: [{ role: 'user', content: 'hello' }],
      stream: true,
    }),
  });

  return answer.text();
}

describe('a Gemini answer arriving in pieces', () => {
  test('reaches an Anthropic caller as one text block, not one per chunk', async () => {
    const sse = await streamedThrough('anthropic', 'Center ', 'it ', 'here.');

    expect(sse.match(/event: content_block_start/gu) ?? []).toHaveLength(1);
    expect(sse.match(/event: content_block_delta/gu) ?? []).toHaveLength(3);
  });

  test('carries every piece the model wrote, in the order it wrote them', async () => {
    const sse = await streamedThrough('anthropic', 'Center ', 'it ', 'again.');
    const said = [...sse.matchAll(/"text_delta","text":"([^"]*)"/gu)].map((hit) => hit[1]).join('');

    expect(said).toBe('Center it again.');
  });

  test('reaches a Chat Completions caller with the same pieces', async () => {
    const sse = await streamedThrough('chat-completions', 'Centered ', 'twice.');
    const said = [...sse.matchAll(/"content":"([^"]*)"/gu)].map((hit) => hit[1]).join('');

    expect(said).toBe('Centered twice.');
  });
});
