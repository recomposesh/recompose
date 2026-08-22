import { describe, expect, test } from 'vitest';

import type { JsonObject } from './gateway-wire';

import { createGatewayApp } from './gateway-app';
import { aGatewayHolding, aVirtualModel } from './gateway-app.testkit';
import { isJsonObject, parsedJson } from './gateway-wire';
import { subscriptionRuntime } from './subscription/reach';

const kimiPlanBlob = JSON.stringify({
  type: 'kimi',
  access_token: 'plan-access',
  refresh_token: 'plan-refresh',
  device_id: 'device-1',
});

const planGrant = {
  verdict: 'resolved',
  providerOrigin: 'https://api.kimi.com/coding',
  spend: {
    custody: 'subscription',
    renewal: 'app',
    provider: 'kimi',
    accountId: 'account-1',
    credential: kimiPlanBlob,
  },
} as const;

const anthropicAnswer = {
  id: 'msg_1',
  type: 'message',
  role: 'assistant',
  model: 'k3',
  content: [{ type: 'text', text: 'hello' }],
  stop_reason: 'end_turn',
  usage: { input_tokens: 1, output_tokens: 1 },
};

function requestBody(init: RequestInit | undefined): JsonObject {
  const parsed = typeof init?.body === 'string' ? parsedJson(init.body) : undefined;

  return isJsonObject(parsed) ? parsed : {};
}

function urlOf(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === 'string') return input;

  return input instanceof URL ? input.href : input.url;
}

type Sent = { url: string; init: RequestInit | undefined };

function planApp(answers: readonly Response[]) {
  const sent: Sent[] = [];
  const kept: string[] = [];
  let turn = 0;
  const fetchLike: typeof fetch = async (input, init) => {
    sent.push({ url: urlOf(input), init });

    const answer = answers[Math.min(turn, answers.length - 1)];

    turn += 1;

    return Promise.resolve(answer ?? Response.json(anthropicAnswer));
  };
  const runtime = {
    ...subscriptionRuntime(async (_provider, _accountId, credential) => {
      kept.push(credential);

      return Promise.resolve();
    }),
    refreshFetch: async (url: string, init: RequestInit) => {
      sent.push({ url, init });

      const answer = answers[Math.min(turn, answers.length - 1)];

      turn += 1;

      return Promise.resolve(answer ?? Response.json(anthropicAnswer));
    },
  };
  const app = createGatewayApp(
    aGatewayHolding(aVirtualModel({ target: { standing: 'bound', providerModel: 'kimi-k3' } })),
    async () => Promise.resolve(planGrant),
    fetchLike,
    runtime,
  );

  return { app, sent, kept };
}

async function askThePlan(app: ReturnType<typeof planApp>['app']): Promise<Response> {
  return app.request('http://127.0.0.1:8397/v1/messages', {
    method: 'POST',
    body: JSON.stringify({
      model: 'fast',
      max_tokens: 32,
      messages: [{ role: 'user', content: 'hello' }],
    }),
  });
}

describe('a turn bought by a Kimi plan', () => {
  test('reaches Kimi Messages under the plan token, in the dialect the caller opened with', async () => {
    const { app, sent } = planApp([Response.json(anthropicAnswer)]);

    const answer = await askThePlan(app);
    const headers = new Headers(sent[0]?.init?.headers);

    expect(answer.status).toBe(200);
    expect(sent[0]?.url).toBe('https://api.kimi.com/coding/v1/messages?beta=true');
    expect(headers.get('authorization')).toBe('Bearer plan-access');
    expect(headers.get('anthropic-beta')).toContain('oauth-2025-04-20');
  });

  test('the body keeps the Anthropic shape rather than being translated for Codex', async () => {
    const { app, sent } = planApp([Response.json(anthropicAnswer)]);

    await askThePlan(app);

    const body = requestBody(sent[0]?.init);

    expect(body).toMatchObject({ model: 'k3', max_tokens: 32 });
    expect(body['input']).toBeUndefined();
    expect(body['max_output_tokens']).toBeUndefined();
  });

  test('a plan the far end turns away renews once and sends again', async () => {
    const { app, sent, kept } = planApp([
      new Response('{}', { status: 401 }),
      Response.json({ access_token: 'fresh-access', refresh_token: 'fresh', expires_in: 900 }),
      Response.json(anthropicAnswer),
    ]);

    const answer = await askThePlan(app);

    expect(answer.status).toBe(200);
    expect(sent[1]?.url).toBe('https://auth.kimi.com/api/oauth/token');
    expect(new Headers(sent[2]?.init?.headers).get('authorization')).toBe('Bearer fresh-access');
    expect(kept).toHaveLength(1);
  });

  test('the plan credential never reaches Kimi as the bearer itself', async () => {
    const { app, sent } = planApp([Response.json(anthropicAnswer)]);

    await askThePlan(app);

    expect(new Headers(sent[0]?.init?.headers).get('authorization')).not.toContain('refresh_token');
  });
});
