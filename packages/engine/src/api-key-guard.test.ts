import { describe, expect, test } from 'vitest';

import { createGatewayApp } from './gateway-app';
import { grantsNothing, neverFetches } from './gateway-app.testkit';

const KEY = 'rc-local-J8xQm2NpVr4wYs6bZa1cLd3fGh5jKm9';

const guarded = {
  slug: 'codex',
  displayName: 'Codex',
  port: 8397,
  apiKey: KEY,
  virtualModels: [],
};

const open = { slug: 'codex', displayName: 'Codex', port: 8397, virtualModels: [] };

async function askGuarded(path: string, init?: RequestInit): Promise<Response> {
  return createGatewayApp(guarded, grantsNothing, neverFetches).request(
    `http://127.0.0.1:8397${path}`,
    init,
  );
}

async function askOpen(path: string, init?: RequestInit): Promise<Response> {
  return createGatewayApp(open, grantsNothing, neverFetches).request(
    `http://127.0.0.1:8397${path}`,
    init,
  );
}

describe('a gateway that requires a key', () => {
  test('a request carrying no key is refused before it reaches a model', async () => {
    const refusal = await askGuarded('/v1/models');

    expect(refusal.status).toBe(401);
  });

  test('the refusal names the gateway, so a failing client says which one to fix', async () => {
    const refusal = await askGuarded('/v1/models');

    expect(JSON.stringify(await refusal.json())).toContain('Codex');
  });

  test('the refusal reads as the error a vendor answers a 401 with', async () => {
    const refusal = await askGuarded('/v1/models');

    await expect(refusal.json()).resolves.toEqual({
      type: 'error',
      error: {
        type: 'authentication_error',
        message: 'The gateway "Codex" requires an API key.',
      },
    });
  });

  test('the refusal challenges the client the way a bearer-protected resource must', async () => {
    const refusal = await askGuarded('/v1/models');

    expect(refusal.headers.get('WWW-Authenticate')).toContain('Bearer');
  });

  test('a wrong key draws the same answer as no key, so nothing says whether a key exists', async () => {
    const missing = await askGuarded('/v1/models');
    const wrong = await askGuarded('/v1/models', {
      headers: { authorization: 'Bearer rc-local-someoneElse' },
    });

    expect(await wrong.text()).toBe(await missing.text());
  });

  test('a wrong key is refused with the same status', async () => {
    const wrong = await askGuarded('/v1/models', { headers: { 'x-api-key': 'nope' } });

    expect(wrong.status).toBe(401);
  });
});

describe('where a client is allowed to carry the key', () => {
  test('the Authorization header behind a Bearer prefix serves', async () => {
    const answer = await askGuarded('/v1/models', {
      headers: { authorization: `Bearer ${KEY}` },
    });

    expect(answer.status).toBe(200);
  });

  test('the Authorization header without a prefix serves, because clients differ', async () => {
    const answer = await askGuarded('/v1/models', { headers: { authorization: KEY } });

    expect(answer.status).toBe(200);
  });

  test('the header Anthropic clients fill serves', async () => {
    const answer = await askGuarded('/v1/models', { headers: { 'x-api-key': KEY } });

    expect(answer.status).toBe(200);
  });

  test('the header Gemini clients fill serves', async () => {
    const answer = await askGuarded('/v1/models', { headers: { 'x-goog-api-key': KEY } });

    expect(answer.status).toBe(200);
  });

  test('the query parameter Gemini clients fill serves', async () => {
    const answer = await askGuarded(`/v1/models?key=${KEY}`);

    expect(answer.status).toBe(200);
  });

  test('a placeholder in one field never masks the key in another', async () => {
    const answer = await askGuarded('/v1/models', {
      headers: { 'x-api-key': 'dummy-key-the-client-invented', authorization: `Bearer ${KEY}` },
    });

    expect(answer.status).toBe(200);
  });

  test('a client naming its scheme in lower case serves, because the scheme is caseless', async () => {
    const answer = await askGuarded('/v1/models', { headers: { authorization: `bearer ${KEY}` } });

    expect(answer.status).toBe(200);
  });

  test('a client that spaced its scheme out still serves', async () => {
    const answer = await askGuarded('/v1/models', {
      headers: { authorization: `Bearer   ${KEY}` },
    });

    expect(answer.status).toBe(200);
  });

  test('a key a person pasted into a query with surrounding space still matches', async () => {
    const answer = await askGuarded(`/v1/models?key=%20${KEY}%20`);

    expect(answer.status).toBe(200);
  });

  test('a key that only begins the same is refused', async () => {
    const refusal = await askGuarded('/v1/models', { headers: { 'x-api-key': KEY.slice(0, -1) } });

    expect(refusal.status).toBe(401);
  });
});

describe('what a gateway answers whether or not it requires a key', () => {
  test('the health path answers, because a credentialed health path proves nothing', async () => {
    const answer = await askGuarded('/health');

    expect(answer.status).toBe(200);
  });

  test('the compatibility health path answers too', async () => {
    const answer = await askGuarded('/healthz');

    expect(answer.status).toBe(200);
  });

  test('the hello probe answers, because a client reads it before it has sent anything', async () => {
    const answer = await askGuarded('/api/hello');

    expect(answer.status).toBe(200);
  });

  test('the health answer is the one an open gateway gives', async () => {
    const guardedAnswer = await askGuarded('/health');
    const openAnswer = await askOpen('/health');

    expect(await guardedAnswer.text()).toBe(await openAnswer.text());
  });
});

describe('what the key closes besides the model paths', () => {
  test('the management log path refuses without the key, because it reads account activity', async () => {
    const refusal = await askGuarded('/v0/management/logs');

    expect(refusal.status).toBe(401);
  });

  test('the management usage path refuses without the key', async () => {
    const refusal = await askGuarded('/v0/management/usage-queue');

    expect(refusal.status).toBe(401);
  });

  test('a path the gateway never served still answers not found rather than unauthorized', async () => {
    const answer = await askGuarded('/nothing-here', { headers: { 'x-api-key': KEY } });

    expect(answer.status).toBe(404);
  });
});

describe('a gateway that requires no key', () => {
  test('a request carrying none is served exactly as before', async () => {
    const answer = await askOpen('/v1/models');

    expect(answer.status).toBe(200);
  });

  test('a request carrying a key nobody asked for is served too', async () => {
    const answer = await askOpen('/v1/models', { headers: { 'x-api-key': 'whatever' } });

    expect(answer.status).toBe(200);
  });

  test('the management paths stay open, because nothing was closed', async () => {
    const answer = await askOpen('/v0/management/logs');

    expect(answer.status).not.toBe(401);
  });
});
