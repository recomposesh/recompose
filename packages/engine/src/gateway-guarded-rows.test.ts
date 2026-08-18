import type { EngineGateway, LogRow } from '@recompose/contracts';

import { afterEach, describe, expect, test } from 'vitest';

import { createGatewayApp } from './gateway-app';
import { aGatewayHolding, aVirtualModel, grantsNothing, neverFetches } from './gateway-app.testkit';
import { collectingRows } from './gateway-logs.testkit';
import { providerObservability } from './provider/provider-observability';

const KEY = 'rc-local-J8xQm2NpVr4wYs6bZa1cLd3fGh5jKm9';

const codex = aGatewayHolding(aVirtualModel());

const keyed: EngineGateway = { ...codex, apiKey: KEY };

const loopbackClient = { incoming: { socket: { remoteAddress: '127.0.0.1' } } };

const aTurn = JSON.stringify({ model: 'fast', messages: [{ role: 'user', content: 'hello' }] });

async function rowsTurningAway(
  gateway: EngineGateway,
  url: string,
  init: RequestInit = { method: 'POST', body: aTurn, headers: { 'user-agent': 'curl/8.7.1' } },
): Promise<LogRow[]> {
  const app = createGatewayApp(gateway, grantsNothing, neverFetches);
  const collected = collectingRows();
  const refusal = await app.request(url, init, loopbackClient);

  await refusal.text();
  collected.forget();

  return collected.standing();
}

afterEach(() => {
  providerObservability().clear();
});

describe('a request the gateway turned away at its edge', () => {
  test('a caller carrying no key leaves a row saying the gateway required one', async () => {
    const rows = await rowsTurningAway(keyed, 'http://127.0.0.1:8397/v1/chat/completions');

    expect(rows).toMatchObject([
      {
        gateway: 'codex',
        origin: 'gateway',
        method: 'POST',
        status: 401,
        failure: 'The gateway "Codex" requires an API key.',
      },
    ]);
  });

  test('a caller naming a host outside the loopback set leaves a row saying so', async () => {
    const rows = await rowsTurningAway(codex, 'http://gateway.example:8397/v1/chat/completions');

    expect(rows).toMatchObject([
      { origin: 'gateway', status: 403, failure: 'This gateway answers loopback clients only.' },
    ]);
  });

  test('a caller carrying an Origin header leaves a row saying no web page may reach it', async () => {
    const rows = await rowsTurningAway(codex, 'http://127.0.0.1:8397/v1/chat/completions', {
      method: 'POST',
      body: aTurn,
      headers: { 'user-agent': 'curl/8.7.1', origin: 'https://evil.example' },
    });

    expect(rows).toMatchObject([
      {
        origin: 'gateway',
        status: 403,
        failure:
          'This gateway refuses any request that carries an Origin header, so no web page can reach it.',
      },
    ]);
  });
});

describe('a path the gateway serves nothing on', () => {
  test('it leaves a row naming the path', async () => {
    const rows = await rowsTurningAway(codex, 'http://127.0.0.1:8397/v1/nowhere');

    expect(rows).toMatchObject([
      {
        origin: 'gateway',
        status: 404,
        failure: 'The gateway "Codex" serves no path "/v1/nowhere".',
      },
    ]);
  });

  test('a Gemini action nobody serves leaves a row naming the path', async () => {
    const rows = await rowsTurningAway(
      codex,
      'http://127.0.0.1:8397/v1beta/models/gemini-2.5-pro:countTokens',
      { method: 'POST', body: JSON.stringify({ contents: [] }) },
    );

    expect(rows).toMatchObject([
      {
        origin: 'gateway',
        status: 404,
        failure: 'The gateway "Codex" serves no path "/v1beta/models/gemini-2.5-pro:countTokens".',
      },
    ]);
  });
});

describe('what a row for a turned-away request stands for', () => {
  test('it names no virtual model, because none ever stood for the request', async () => {
    const rows = await rowsTurningAway(keyed, 'http://127.0.0.1:8397/v1/chat/completions');

    expect(rows.at(0)?.virtualModel).toBeUndefined();
    expect(rows.at(0)?.provider).toBeUndefined();
    expect(rows.at(0)?.providerModel).toBeUndefined();
  });

  test('it keys the caller it turned away, so the footer counts it apart', async () => {
    const rows = await rowsTurningAway(keyed, 'http://127.0.0.1:8397/v1/chat/completions');

    expect(rows.at(0)?.clientKey).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  test('nothing the refused request carried rides the row', async () => {
    const asked = JSON.stringify({ model: 'fast', messages: [{ role: 'user', content: 'diary' }] });
    const rows = await rowsTurningAway(keyed, 'http://127.0.0.1:8397/v1/chat/completions', {
      method: 'POST',
      body: asked,
      headers: { 'user-agent': 'curl/8.7.1', authorization: 'Bearer rc-local-wrong' },
    });

    expect(JSON.stringify(rows)).not.toContain('diary');
    expect(JSON.stringify(rows)).not.toContain('rc-local-wrong');
  });
});

describe('what the edge still lets through without a row', () => {
  test('a health check on a keyed gateway leaves no row, because nothing was refused', async () => {
    const rows = await rowsTurningAway(keyed, 'http://127.0.0.1:8397/health', { method: 'GET' });

    expect(rows).toEqual([]);
  });

  test('a caller carrying the key leaves no row of its own for the guard', async () => {
    const rows = await rowsTurningAway(keyed, 'http://127.0.0.1:8397/v1/models', {
      method: 'GET',
      headers: { authorization: `Bearer ${KEY}` },
    });

    expect(rows).toEqual([]);
  });
});
