import { describe, expect, test } from 'vitest';

import type { JsonObject } from './gateway-wire';

import { createGatewayApp } from './gateway-app';
import { aCredentialedGrant, aGatewayHolding, aVirtualModel } from './gateway-app.testkit';
import { isJsonObject, parsedJson } from './gateway-wire';

const creditRefusal = {
  error: {
    message: 'You requested up to 32000 tokens, but can only afford 6588.',
    code: 402,
    metadata: { limit_source: 'openrouter_credits' },
  },
};

const toolRefusal = {
  error: { message: 'tool calling is not supported', param: 'tool calling' },
};

const served = {
  id: 'chatcmpl_1',
  object: 'chat.completion',
  choices: [{ index: 0, message: { role: 'assistant', content: 'hello' }, finish_reason: 'stop' }],
};

async function turnsSent(refusal: JsonObject, status: number, ask: JsonObject) {
  const sent: JsonObject[] = [];
  const app = createGatewayApp(
    aGatewayHolding(aVirtualModel()),
    async () => Promise.resolve(aCredentialedGrant('https://openrouter.ai/api/v1', 'openrouter')),
    async (_input, init) => {
      const body = typeof init?.body === 'string' ? parsedJson(init.body) : undefined;

      sent.push(isJsonObject(body) ? body : {});

      return Promise.resolve(
        sent.length === 1 ? Response.json(refusal, { status }) : Response.json(served),
      );
    },
  );

  await app.request('http://127.0.0.1:8397/v1/chat/completions', {
    method: 'POST',
    body: JSON.stringify({ model: 'fast', messages: [{ role: 'user', content: 'hi' }], ...ask }),
  });

  return sent;
}

describe('a vendor refusal that names its own remedy', () => {
  test('asks again inside the credit the account holds', async () => {
    const sent = await turnsSent(creditRefusal, 402, { max_tokens: 32_000 });

    expect(sent).toHaveLength(2);
    expect(sent[1]?.['max_tokens']).toBe(6588);
  });

  test('asks again without the tools the model answers none of', async () => {
    const sent = await turnsSent(toolRefusal, 400, {
      tools: [{ type: 'function', function: { name: 'run', parameters: {} } }],
    });

    expect(sent).toHaveLength(2);
    expect(sent[1]?.['tools']).toBeUndefined();
  });

  test('asks once where the refusal names no remedy', async () => {
    const sent = await turnsSent({ error: { message: 'upstream is down' } }, 503, {
      max_tokens: 32_000,
    });

    expect(sent).toHaveLength(1);
  });
});
