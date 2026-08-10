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
import { collectingRows } from './gateway-logs.testkit';
import { providerObservability } from './provider/provider-observability';

const codex = aGatewayHolding(aVirtualModel());

const aTurn = JSON.stringify({ model: 'fast', messages: [{ role: 'user', content: 'hello' }] });

const loopbackClient = { incoming: { socket: { remoteAddress: '127.0.0.1' } } };

function aWorkGrant(): SpendGrant {
  return {
    verdict: 'resolved',
    providerOrigin: 'http://127.0.0.1:4242',
    spend: {
      custody: 'credentialed',
      provider: 'openai',
      credential: 'sk-live-40d1',
      accountId: 'work',
    },
  };
}

function servingGateway(answer: () => Response): Hono {
  const { fetchLike } = fetchAnsweringWith(answer);

  return createGatewayApp(codex, granting(aWorkGrant()).grantFor, fetchLike);
}

function refusingGateway(): Hono {
  return createGatewayApp(codex, grantsNothing, neverFetches);
}

async function ask(app: Hono, body: string, userAgent = 'curl/8.7.1'): Promise<void> {
  const answer = await app.request(
    'http://127.0.0.1:8397/v1/chat/completions',
    { method: 'POST', body, headers: { 'user-agent': userAgent } },
    loopbackClient,
  );

  await answer.text();
}

async function rowsWhile(serving: () => Promise<void>): Promise<LogRow[]> {
  const collected = collectingRows();

  await serving();
  collected.forget();

  return collected.standing();
}

async function rowsFrom(app: Hono, body = aTurn, userAgent?: string): Promise<LogRow[]> {
  return rowsWhile(async () => {
    await ask(app, body, userAgent);
  });
}

afterEach(() => {
  providerObservability().clear();
});

describe('a request a gateway carried through to its target', () => {
  test('the row names the gateway, the virtual model, and the target it resolved to', async () => {
    const rows = await rowsFrom(servingGateway(() => Response.json({ choices: [] })));

    expect(rows).toMatchObject([
      {
        gateway: 'codex',
        virtualModel: 'fast',
        origin: 'provider',
        method: 'POST',
        provider: 'openai',
        accountId: 'work',
        providerModel: 'gpt-5-mini',
        status: 200,
      },
    ]);
  });

  test('the row counts the tokens the turn spent as one total', async () => {
    const answer = () => Response.json({ choices: [], usage: { total_tokens: 41 } });

    expect((await rowsFrom(servingGateway(answer))).at(0)?.tokens).toBe(41);
  });

  test('the row times the turn, because a person reads how long it took', async () => {
    const rows = await rowsFrom(servingGateway(() => Response.json({ choices: [] })));

    expect(rows.at(0)?.durationMs).toBeGreaterThanOrEqual(0);
  });

  test('the row is stamped by the wall clock, because the request clock only counts forward', async () => {
    const before = Date.now();
    const rows = await rowsFrom(servingGateway(() => Response.json({ choices: [] })));

    expect(rows.at(0)?.at).toBeGreaterThanOrEqual(before);
  });

  test('no two rows share an id, because the renderer cache merges by id', async () => {
    const app = servingGateway(() => Response.json({ choices: [] }));
    const rows = await rowsWhile(async () => {
      await ask(app, aTurn);
      await ask(app, aTurn);
    });

    expect(new Set(rows.map((row) => row.id)).size).toBe(2);
  });
});

describe('a request that failed', () => {
  test('a request a target turned away lands as exactly one row', async () => {
    const rows = await rowsFrom(servingGateway(() => new Response('{}', { status: 429 })));

    expect(rows).toHaveLength(1);
    expect(rows.at(0)).toMatchObject({ origin: 'provider', status: 429 });
  });

  test('a failed row leaves its duration empty and reads the status as a sentence', async () => {
    const rows = await rowsFrom(servingGateway(() => new Response('{}', { status: 429 })));

    expect(rows.at(0)?.durationMs).toBeUndefined();
    expect(rows.at(0)?.failure).toBe('The target is turning requests away for now.');
  });

  test('a target that answered the first failing status reads as a failure', async () => {
    const rows = await rowsFrom(servingGateway(() => new Response('{}', { status: 400 })));

    expect(rows.at(0)?.failure).toEqual(expect.any(String));
    expect(rows.at(0)?.durationMs).toBeUndefined();
  });

  test('a virtual model whose target left lands as one row the gateway raised', async () => {
    const rows = await rowsFrom(refusingGateway());

    expect(rows).toMatchObject([
      {
        gateway: 'codex',
        virtualModel: 'fast',
        origin: 'gateway',
        method: 'POST',
        status: 502,
        failure: 'The gateway could not reach the target.',
      },
    ]);
    expect(rows.at(0)?.provider).toBeUndefined();
    expect(rows.at(0)?.providerModel).toBeUndefined();
  });

  test('a request too broken to read lands as a row naming no virtual model', async () => {
    const rows = await rowsFrom(refusingGateway(), '{"model":');

    expect(rows).toMatchObject([
      {
        gateway: 'codex',
        origin: 'gateway',
        status: 400,
        failure: 'The gateway could not read the request.',
      },
    ]);
    expect(rows.at(0)?.virtualModel).toBeUndefined();
  });
});

describe('what a row never carries', () => {
  test('nothing the request asked for rides a row', async () => {
    const asked = JSON.stringify({
      model: 'fast',
      messages: [{ role: 'user', content: 'my diary entry' }],
    });
    const rows = await rowsFrom(refusingGateway(), asked);

    expect(JSON.stringify(rows)).not.toContain('my diary entry');
  });

  test('nothing the target answered rides a row', async () => {
    const answer = () => new Response(JSON.stringify({ error: 'quota for acme' }), { status: 402 });
    const rows = await rowsFrom(servingGateway(answer));

    expect(JSON.stringify(rows)).not.toContain('acme');
  });

  test('the address it came from never rides a row, only the key standing for it', async () => {
    const rows = await rowsFrom(servingGateway(() => Response.json({ choices: [] })));

    expect(JSON.stringify(rows)).not.toContain('127.0.0.1');
    expect(JSON.stringify(rows)).not.toContain('curl/8.7.1');
    expect(rows.at(0)?.clientKey).toMatch(/^sha256:[0-9a-f]{64}$/);
  });
});

describe('the client a row stands for', () => {
  test('two client apps under one gateway are keyed apart', async () => {
    const app = refusingGateway();
    const rows = await rowsWhile(async () => {
      await ask(app, aTurn, 'curl/8.7.1');
      await ask(app, aTurn, 'claude-code/2.1.0');
    });

    expect(new Set(rows.map((row) => row.clientKey)).size).toBe(2);
  });

  test('one client app keeps one key across its requests', async () => {
    const app = refusingGateway();
    const rows = await rowsWhile(async () => {
      await ask(app, aTurn, 'curl/8.7.1');
      await ask(app, aTurn, 'curl/8.7.1');
    });

    expect(new Set(rows.map((row) => row.clientKey)).size).toBe(1);
  });

  test('one client app reaching from two addresses is keyed apart', async () => {
    const app = refusingGateway();
    const rows = await rowsWhile(async () => {
      await ask(app, aTurn);
      const answer = await app.request(
        'http://127.0.0.1:8397/v1/chat/completions',
        { method: 'POST', body: aTurn, headers: { 'user-agent': 'curl/8.7.1' } },
        { incoming: { socket: { remoteAddress: '::1' } } },
      );

      await answer.text();
    });

    expect(new Set(rows.map((row) => row.clientKey)).size).toBe(2);
  });
});

describe('what lands no row at all', () => {
  test('a health check lands no row, because no virtual model answered it', async () => {
    const app = servingGateway(() => Response.json({ choices: [] }));
    const rows = await rowsWhile(async () => {
      await app.request('http://127.0.0.1:8397/health');
    });

    expect(rows).toEqual([]);
  });

  test('a model nobody defined lands no row, because no cable owns it', async () => {
    const asked = JSON.stringify({ model: 'ghost', messages: [] });

    expect(await rowsFrom(refusingGateway(), asked)).toEqual([]);
  });

  test('a request the platform named no address for is still keyed to a client', async () => {
    const app = refusingGateway();
    const rows = await rowsWhile(async () => {
      const answer = await app.request('http://127.0.0.1:8397/v1/chat/completions', {
        method: 'POST',
        body: aTurn,
      });

      await answer.text();
    });

    expect(rows.at(0)?.clientKey).toMatch(/^sha256:[0-9a-f]{64}$/);
  });
});
