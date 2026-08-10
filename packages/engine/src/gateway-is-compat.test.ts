import type { SpendGrant } from '@recompose/contracts';

import { describe, expect, test } from 'vitest';

import { createGatewayApp } from './gateway-app';
import {
  aGatewayHolding,
  aVirtualModel,
  bodySentIn,
  fetchAnsweringWith,
  granting,
} from './gateway-app.testkit';

const virtual = aVirtualModel({
  target: { standing: 'bound', providerModel: 'deepseek-v4-flash' },
});

function credentialed(provider: string, isCompat: boolean): SpendGrant {
  return {
    verdict: 'resolved',
    providerOrigin: 'https://upstream.example',
    spend: {
      custody: 'credentialed',
      provider,
      credential: 'secret',
      ...(isCompat ? { isCompat: true } : {}),
    },
  };
}

async function anthropicToChat(isCompat: boolean) {
  const upstream = fetchAnsweringWith(() =>
    Response.json({ id: 'chatcmpl_1', choices: [], usage: {} }),
  );
  const app = createGatewayApp(
    aGatewayHolding(virtual),
    granting(credentialed('openrouter', isCompat)).grantFor,
    upstream.fetchLike,
  );

  await app.request('http://127.0.0.1:8397/v1/messages', {
    method: 'POST',
    body: JSON.stringify({
      model: 'fast',
      max_tokens: 32,
      messages: [
        { role: 'user', content: 'question' },
        {
          role: 'assistant',
          content: [
            { type: 'thinking', thinking: 'private reasoning', signature: '' },
            { type: 'text', text: 'answer' },
          ],
        },
      ],
    }),
  });

  return bodySentIn(upstream.sent);
}

async function chatToAnthropic(isCompat: boolean) {
  const upstream = fetchAnsweringWith(() =>
    Response.json({
      id: 'msg_1',
      type: 'message',
      role: 'assistant',
      model: 'claude-test',
      content: [{ type: 'text', text: 'done' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 1, output_tokens: 1 },
    }),
  );
  const app = createGatewayApp(
    aGatewayHolding(virtual),
    granting(credentialed('anthropic', isCompat)).grantFor,
    upstream.fetchLike,
  );

  await app.request('http://127.0.0.1:8397/v1/chat/completions', {
    method: 'POST',
    body: JSON.stringify({
      model: 'fast',
      messages: [
        { role: 'user', content: 'question' },
        { role: 'assistant', reasoning_content: 'private reasoning', content: 'answer' },
      ],
    }),
  });

  return bodySentIn(upstream.sent);
}

describe('a configured compatibility model behind an OpenAI-compatible target', () => {
  test('preserves Claude thinking as reasoning content', async () => {
    const body = await anthropicToChat(true);

    expect(body).toHaveProperty('messages.1.reasoning_content', 'private reasoning');
  });

  test('keeps native translation unchanged when compatibility is disabled', async () => {
    const body = await anthropicToChat(false);

    expect(body).not.toHaveProperty('messages.1.reasoning_content');
  });
});

describe('a configured compatibility model behind a Claude target', () => {
  test('preserves OpenAI reasoning as a Claude thinking block', async () => {
    const body = await chatToAnthropic(true);

    expect(body).toHaveProperty('messages.1.content.0', {
      type: 'thinking',
      thinking: 'private reasoning',
      signature: '',
    });
  });

  test('drops incompatible reasoning when compatibility is disabled', async () => {
    const body = await chatToAnthropic(false);

    expect(JSON.stringify(body)).not.toContain('private reasoning');
  });
});
