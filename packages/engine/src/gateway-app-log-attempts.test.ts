import type { LogRow, SpendGrant } from '@recompose/contracts';
import type { Hono } from 'hono';
import type { MockInstance } from 'vitest';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { SpendGrantFor } from './gateway-app';

import { createGatewayApp } from './gateway-app';
import { aGatewayHolding, aHeldStream, aVirtualModel } from './gateway-app.testkit';
import { collectingRows } from './gateway-logs.testkit';
import { subscribeToLogRows } from './gateway-traffic';
import { providerObservability } from './provider/provider-observability';

const fast = aVirtualModel();

const deep = aVirtualModel({ id: 'deep', displayName: 'Deep' });

const codex = aGatewayHolding(fast, deep);

const loopbackClient = { incoming: { socket: { remoteAddress: '127.0.0.1' } } };

function aGrantFor(providerModel: string): SpendGrant {
  return {
    verdict: 'resolved',
    providerOrigin: `http://127.0.0.1:4242/${providerModel}`,
    spend: { custody: 'credentialed', provider: 'openai', credential: 'sk-live-40d1' },
  };
}

const grantsAfterAPause: SpendGrantFor = async (_slug, virtualModel) => {
  await new Promise((waited) => {
    setTimeout(waited, virtualModel === 'fast' ? 12 : 1);
  });

  return aGrantFor(virtualModel);
};

function gatewayAnswering(answer: () => Response | Promise<Response>): Hono {
  return createGatewayApp(codex, grantsAfterAPause, async () => answer());
}

async function ask(app: Hono, model: string, clientApp: string): Promise<Response> {
  return app.request(
    'http://127.0.0.1:8397/v1/chat/completions',
    {
      method: 'POST',
      body: JSON.stringify({ model, messages: [{ role: 'user', content: 'hello' }] }),
      headers: { 'user-agent': clientApp },
    },
    loopbackClient,
  );
}

function collecting(): { rows: () => LogRow[]; forget: () => void } {
  const collected = collectingRows();

  return { rows: collected.standing, forget: collected.forget };
}

function keyThrough(rows: readonly LogRow[], virtualModel: string): string | undefined {
  return rows.find((row) => row.virtualModel === virtualModel)?.clientKey;
}

let complaints: MockInstance;

beforeEach(() => {
  complaints = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  complaints.mockRestore();
  providerObservability().clear();
});

describe('a target the gateway could not reach at all', () => {
  test('the request lands one row the gateway raised, with empty provider cells', async () => {
    const app = gatewayAnswering(() => {
      throw new Error('connect ECONNREFUSED 127.0.0.1:4242');
    });
    const { rows, forget } = collecting();

    await (await ask(app, 'fast', 'curl/8.7.1')).text();
    forget();

    expect(rows()).toHaveLength(1);
    expect(rows().at(0)).toMatchObject({ origin: 'gateway', status: 502, virtualModel: 'fast' });
    expect(rows().at(0)?.provider).toBeUndefined();
    expect(rows().at(0)?.providerModel).toBeUndefined();
  });
});

describe('an answer whose body nobody read', () => {
  test('the request still lands exactly one row, because a row never waits on a body', async () => {
    const held = aHeldStream();
    const app = gatewayAnswering(
      () => new Response(held.stream, { headers: { 'content-type': 'text/event-stream' } }),
    );
    const { rows, forget } = collecting();

    await ask(app, 'fast', 'curl/8.7.1');
    forget();

    expect(rows()).toHaveLength(1);
    expect(rows().at(0)).toMatchObject({ origin: 'provider', status: 200, virtualModel: 'fast' });
    held.end();
  });

  test('the row keeps its place and gains its tokens once the body ends', async () => {
    const answer = () => Response.json({ choices: [], usage: { total_tokens: 41 } });
    const app = gatewayAnswering(answer);
    const collected = collectingRows();

    await (await ask(app, 'fast', 'curl/8.7.1')).text();
    collected.forget();

    const [first] = collected.told;

    expect(collected.standing()).toHaveLength(1);
    expect(first?.tokens).toBeUndefined();
    expect(collected.told.at(-1)?.at).toBe(first?.at);
    expect(collected.standing().at(0)?.tokens).toBe(41);
  });
});

describe('a reader that throws while a request is being served', () => {
  test('the caller keeps its answer, because telemetry never rides the serving path', async () => {
    const app = gatewayAnswering(() => Response.json({ choices: [] }));
    const forget = subscribeToLogRows(() => {
      throw new Error('the reader broke');
    });

    const answer = await ask(app, 'fast', 'curl/8.7.1');

    await answer.text();
    forget();

    expect(answer.status).toBe(200);
  });
});

describe('two requests in flight at once', () => {
  test('neither takes the other gateway, virtual model, or client key', async () => {
    const app = gatewayAnswering(() => Response.json({ choices: [] }));
    const alone = collecting();

    await (await ask(app, 'fast', 'curl/8.7.1')).text();
    await (await ask(app, 'deep', 'claude-code/2.1.0')).text();
    alone.forget();

    const together = collecting();
    const answers = await Promise.all([
      ask(app, 'fast', 'curl/8.7.1'),
      ask(app, 'deep', 'claude-code/2.1.0'),
    ]);

    await Promise.all(answers.map(async (answer) => answer.text()));
    together.forget();

    const alongside = together.rows();
    const apart = alone.rows();

    expect(keyThrough(alongside, 'fast')).toBe(keyThrough(apart, 'fast'));
    expect(keyThrough(alongside, 'deep')).toBe(keyThrough(apart, 'deep'));
    expect(alongside.map((row) => row.gateway)).toEqual(['codex', 'codex']);
    expect(new Set(alongside.map((row) => row.clientKey)).size).toBe(2);
  });
});
