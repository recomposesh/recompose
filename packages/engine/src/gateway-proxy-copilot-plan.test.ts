import { describe, expect, test } from 'vitest';

import type { JsonObject } from './gateway-wire';

import { createGatewayApp } from './gateway-app';
import { aGatewayHolding, aVirtualModel } from './gateway-app.testkit';
import { isJsonObject, parsedJson } from './gateway-wire';
import { subscriptionRuntime } from './subscription/reach';

const boughtToken = 'tid=abc;exp=1787430000;sku=copilot_pro;proxy-ep=api.githubcopilot.com';

const planGrant = {
  verdict: 'resolved',
  providerOrigin: 'https://api.githubcopilot.com',
  spend: {
    custody: 'subscription',
    renewal: 'app',
    provider: 'copilot',
    accountId: 'account-1',
    credential: boughtToken,
  },
} as const;

const chatAnswer = {
  id: 'chatcmpl_1',
  object: 'chat.completion',
  choices: [{ index: 0, message: { role: 'assistant', content: 'hello' }, finish_reason: 'stop' }],
};

function requestBody(init: RequestInit | undefined): JsonObject {
  const parsed = typeof init?.body === 'string' ? parsedJson(init.body) : undefined;

  return isJsonObject(parsed) ? parsed : {};
}

function urlOf(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === 'string') return input;

  return input instanceof URL ? input.href : input.url;
}

function planApp() {
  const sent: { url: string; init: RequestInit | undefined }[] = [];
  const fetchLike: typeof fetch = async (input, init) => {
    sent.push({ url: urlOf(input), init });

    return Promise.resolve(Response.json(chatAnswer));
  };
  const app = createGatewayApp(
    aGatewayHolding(aVirtualModel({ target: { standing: 'bound', providerModel: 'gpt-5.2' } })),
    async () => Promise.resolve(planGrant),
    fetchLike,
    subscriptionRuntime(),
  );

  return { app, sent };
}

async function askThePlan(app: ReturnType<typeof planApp>['app']): Promise<Response> {
  return app.request('http://127.0.0.1:8397/v1/chat/completions', {
    method: 'POST',
    body: JSON.stringify({ model: 'fast', messages: [{ role: 'user', content: 'hello' }] }),
  });
}

describe('a turn bought by a Copilot plan', () => {
  test('reaches the Copilot chat endpoint rather than a versioned one', async () => {
    const { app, sent } = planApp();

    const answer = await askThePlan(app);

    expect(answer.status).toBe(200);
    expect(sent[0]?.url).toBe('https://api.githubcopilot.com/chat/completions');
  });

  test('carries the short-lived credential the parent bought as its bearer', async () => {
    const { app, sent } = planApp();

    await askThePlan(app);

    expect(new Headers(sent[0]?.init?.headers).get('authorization')).toBe(`Bearer ${boughtToken}`);
  });

  test('names the editor Copilot serves, the way its own plugin does', async () => {
    const { app, sent } = planApp();

    await askThePlan(app);

    const headers = new Headers(sent[0]?.init?.headers);

    expect(headers.get('copilot-integration-id')).toBe('vscode-chat');
    expect(headers.get('editor-version')).toBe('vscode/1.110.1');
    expect(headers.get('editor-plugin-version')).toBe('copilot-chat/0.38.2');
    expect(headers.get('x-github-api-version')).toBe('2025-10-01');
  });

  test('the body stays OpenAI-compatible rather than being translated for Codex', async () => {
    const { app, sent } = planApp();

    await askThePlan(app);

    const body = requestBody(sent[0]?.init);

    expect(body).toMatchObject({ model: 'gpt-5.2' });
    expect(body['input']).toBeUndefined();
    expect(body['max_output_tokens']).toBeUndefined();
  });

  test('a credential that is no document at all never reads as a missing account', async () => {
    const { app } = planApp();

    const answer = await askThePlan(app);

    expect(answer.status).not.toBe(502);
  });
});
