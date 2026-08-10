import type { LogRow, SpendGrant } from '@recompose/contracts';
import type { Hono } from 'hono';

import { afterEach, describe, expect, test } from 'vitest';

import { createGatewayApp } from './gateway-app';
import {
  aGatewayHolding,
  aVirtualModel,
  fetchAnsweringWith,
  granting,
  grantsNothing,
  neverFetches,
} from './gateway-app.testkit';
import { noteUnreadableRequest, subscribeToLogRows } from './gateway-traffic';
import { providerObservability } from './provider/provider-observability';

const codex = aGatewayHolding(aVirtualModel());

const aTurn = JSON.stringify({ model: 'fast', messages: [{ role: 'user', content: 'hello' }] });

function aGrant(): SpendGrant {
  return {
    verdict: 'resolved',
    providerOrigin: 'http://127.0.0.1:4242',
    spend: { custody: 'credentialed', provider: 'openai', credential: 'sk-live-40d1' },
  };
}

function collecting(): { rows: LogRow[]; forget: () => void } {
  const rows: LogRow[] = [];

  return {
    rows,
    forget: subscribeToLogRows((row) => {
      rows.push(row);
    }),
  };
}

async function ask(app: Hono): Promise<void> {
  const answer = await app.request(
    'http://127.0.0.1:8397/v1/chat/completions',
    { method: 'POST', body: aTurn, headers: { 'user-agent': 'curl/8.7.1' } },
    { incoming: { socket: { remoteAddress: '127.0.0.1' } } },
  );

  await answer.text();
}

afterEach(() => {
  providerObservability().clear();
});

describe('a provider call no gateway asked for', () => {
  test('a call outside any serving turn lands no row, because no gateway owns it', () => {
    const { rows, forget } = collecting();
    const span = providerObservability().start({
      provider: 'anthropic',
      model: 'claude-sonnet-4-5',
      dialect: 'anthropic',
      method: 'POST',
    });

    span.complete(200, new Headers(), new TextEncoder().encode('{}'));
    forget();

    expect(rows).toEqual([]);
    expect(providerObservability().snapshot()).toHaveLength(1);
  });
});

describe('a request too broken to read that reached no gateway', () => {
  test('it lands no row, because a row names the gateway and the client it came from', () => {
    const { rows, forget } = collecting();

    noteUnreadableRequest();
    forget();

    expect(rows).toEqual([]);
  });
});

describe('a reader that stopped listening', () => {
  test('it hears no further row a provider answered', async () => {
    const { fetchLike } = fetchAnsweringWith(() => Response.json({ choices: [] }));
    const app = createGatewayApp(codex, granting(aGrant()).grantFor, fetchLike);
    const { rows, forget } = collecting();

    await ask(app);
    forget();
    await ask(app);

    expect(rows).toHaveLength(1);
  });

  test('it hears no further row the gateway raised', async () => {
    const app = createGatewayApp(codex, grantsNothing, neverFetches);
    const { rows, forget } = collecting();

    await ask(app);
    forget();
    await ask(app);

    expect(rows).toHaveLength(1);
  });
});
