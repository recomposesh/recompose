import { describe, expect, test } from 'vitest';

import type { JsonObject } from './gateway-wire';

import { createGatewayApp } from './gateway-app';
import { aCredentialedGrant, aGatewayHolding, aVirtualModel } from './gateway-app.testkit';
import { isJsonObject, parsedJson } from './gateway-wire';

const carrierSignature =
  'cpa-gemini-carrier-v1:next:text:RWpRS01nRU1PZGJITzBHZCtjOU14azRFTHdQR2JwQ0VjcDJtRmZZWUxpeDJVVnRCSDNmTDhHRUNjNCtKSVRWbkhGNHFaRHNB';

const anthropicAnswer = {
  id: 'msg_1',
  type: 'message',
  role: 'assistant',
  content: [{ type: 'text', text: 'hi there' }],
  stop_reason: 'end_turn',
  usage: { input_tokens: 3, output_tokens: 2 },
};

async function turnSentFor(blocks: readonly JsonObject[]): Promise<JsonObject> {
  let sent: JsonObject = {};
  const app = createGatewayApp(
    aGatewayHolding(aVirtualModel()),
    async () => Promise.resolve(aCredentialedGrant('https://api.kimi.com/coding', 'kimi')),
    async (_input, init) => {
      const body = typeof init?.body === 'string' ? parsedJson(init.body) : undefined;

      sent = isJsonObject(body) ? body : {};

      return Promise.resolve(Response.json(anthropicAnswer));
    },
  );

  await app.request('http://127.0.0.1:8397/v1/messages', {
    method: 'POST',
    body: JSON.stringify({
      model: 'fast',
      max_tokens: 64,
      messages: [
        { role: 'user', content: 'hello' },
        { role: 'assistant', content: blocks },
        { role: 'user', content: 'and what is left' },
      ],
    }),
  });

  return sent;
}

function assistantBlocksOf(sent: JsonObject): unknown {
  const messages = sent['messages'];
  const assistant: unknown = Array.isArray(messages) ? messages[1] : undefined;

  return isJsonObject(assistant) ? assistant['content'] : undefined;
}

describe('a turn crossing to a vendor that reads neither block', () => {
  test('leaves the Gemini carrier behind rather than sending it on', async () => {
    const sent = await turnSentFor([
      { type: 'thinking', thinking: '', signature: carrierSignature },
      { type: 'text', text: 'hi there' },
    ]);

    expect(assistantBlocksOf(sent)).toEqual([{ type: 'text', text: 'hi there' }]);
  });

  test('leaves the empty text block the vendor refuses the whole turn over', async () => {
    const sent = await turnSentFor([
      { type: 'text', text: '' },
      { type: 'text', text: 'hi there' },
    ]);

    expect(assistantBlocksOf(sent)).toEqual([{ type: 'text', text: 'hi there' }]);
  });

  test('sends a turn the caller wrote in full exactly as written', async () => {
    const blocks = [{ type: 'text', text: 'hi there' }];

    expect(assistantBlocksOf(await turnSentFor(blocks))).toEqual(blocks);
  });
});
