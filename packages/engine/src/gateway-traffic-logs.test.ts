import type { LogRow, SpendGrant } from '@recompose/contracts';
import type { Hono } from 'hono';

import { afterEach, describe, expect, test, vi } from 'vitest';

import type { ServingTurn } from './provider/serving-turn';

import { createGatewayApp } from './gateway-app';
import {
  aGatewayHolding,
  aVirtualModel,
  fetchAnsweringWith,
  granting,
  grantsNothing,
  neverFetches,
} from './gateway-app.testkit';
import { aHeldStream } from './gateway-app.testkit';
import { collectingRows } from './gateway-logs.testkit';
import { noteUnreadableRequest, subscribeToLogRows } from './gateway-traffic';
import { providerObservability } from './provider/provider-observability';
import { sha256Digest } from './provider/provider-observation';
import { withinServingTurn } from './provider/serving-turn';

const codex = aGatewayHolding(aVirtualModel());

const aTurn = JSON.stringify({ model: 'fast', messages: [{ role: 'user', content: 'hello' }] });

function aGrant(): SpendGrant {
  return {
    verdict: 'resolved',
    providerOrigin: 'http://127.0.0.1:4242',
    spend: { custody: 'credentialed', provider: 'openai', credential: 'sk-live-40d1' },
  };
}

function collecting(): { rows: () => LogRow[]; forget: () => void } {
  const collected = collectingRows();

  return { rows: collected.standing, forget: collected.forget };
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

    expect(rows()).toEqual([]);
    expect(providerObservability().snapshot()).toHaveLength(1);
  });
});

describe('a request too broken to read that reached no gateway', () => {
  test('it lands no row, because a row names the gateway and the client it came from', () => {
    const { rows, forget } = collecting();

    noteUnreadableRequest();
    forget();

    expect(rows()).toEqual([]);
  });
});

function reachingWith(provider: string, model: string, requestId?: string): void {
  const span = providerObservability().start({
    provider,
    model,
    dialect: 'anthropic',
    method: 'POST',
    requestId,
  });

  span.complete(200, new Headers(), new TextEncoder().encode('{}'));
}

const aTurnOf = (gateway: string): ServingTurn => ({
  gateway,
  clientKey: `sha256:${'a'.repeat(64)}`,
  method: 'POST',
  virtualModel: 'fast',
  rowPublished: false,
});

describe('a reach that names no provider model', () => {
  test('it lands no row, because a row names the target it resolved to', () => {
    const { rows, forget } = collecting();

    withinServingTurn(aTurnOf('codex'), () => {
      reachingWith('plugin:transcribe', '');
      reachingWith('plugin:transcribe', '   ');
    });
    forget();

    expect(rows()).toEqual([]);
  });

  test('it leaves the gateway free to raise its own row, having reached no provider', () => {
    const { rows, forget } = collecting();

    withinServingTurn(aTurnOf('codex'), () => {
      reachingWith('plugin:transcribe', '');
      noteUnreadableRequest();
    });
    forget();

    expect(rows()).toMatchObject([{ origin: 'gateway', status: 400 }]);
  });
});

describe('a reach whose provider names arrived blank', () => {
  test('the row leaves those cells empty rather than printing a blank', () => {
    const { rows, forget } = collecting();

    withinServingTurn(aTurnOf('codex'), () => {
      const span = providerObservability().start({
        provider: '   ',
        model: 'gpt-5-mini',
        accountId: '  ',
        dialect: 'chat-completions',
        method: 'POST',
      });

      span.complete(200, new Headers(), new TextEncoder().encode('{}'));
    });
    forget();

    expect(rows().at(0)).toMatchObject({ providerModel: 'gpt-5-mini' });
    expect(rows().at(0)?.provider).toBeUndefined();
    expect(rows().at(0)?.accountId).toBeUndefined();
  });
});

describe('two attempts at one request', () => {
  test('they stand as two rows sharing the one hashed request identity', () => {
    const { rows, forget } = collecting();

    withinServingTurn(aTurnOf('codex'), () => {
      reachingWith('anthropic', 'claude-sonnet-4-5', 'req-7');
      reachingWith('anthropic', 'claude-sonnet-4-5', 'req-7');
    });
    forget();

    expect(new Set(rows().map((row) => row.id)).size).toBe(2);
    expect(
      providerObservability()
        .snapshot()
        .map(({ requestIdHash }) => requestIdHash),
    ).toEqual([sha256Digest('req-7'), sha256Digest('req-7')]);
  });
});

describe('a turn that asked for a second grant', () => {
  test('both tellings of one attempt name the virtual model that reach was granted', async () => {
    const turn = aTurnOf('codex');
    const collected = collectingRows();
    const held = aHeldStream();

    await withinServingTurn(turn, async () => {
      const answered = providerObservability()
        .start({
          provider: 'openai',
          model: 'gpt-5-mini',
          dialect: 'chat-completions',
          method: 'POST',
        })
        .observe(new Response(held.stream));

      turn.virtualModel = 'deep';
      held.end();
      await answered.text();
    });
    collected.forget();

    expect(collected.told.map(({ virtualModel }) => virtualModel)).toEqual(['fast', 'fast']);
  });
});

describe('a reader that broke on a row', () => {
  test('the failure is written down against the fact it broke on', () => {
    const complaints = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const forget = subscribeToLogRows(() => {
      throw new Error('the reader broke');
    });

    withinServingTurn(aTurnOf('codex'), () => {
      reachingWith('anthropic', 'claude-sonnet-4-5');
    });
    withinServingTurn(aTurnOf('relay'), () => {
      noteUnreadableRequest();
    });
    forget();

    const said = JSON.stringify(complaints.mock.calls);

    expect(said).toContain('request row');
    expect(said).toContain('log row');
    complaints.mockRestore();
  });
});

describe('a request that already stands as a row', () => {
  test('the gateway raises nothing further for it, because one request is one row', () => {
    const { rows, forget } = collecting();

    withinServingTurn(aTurnOf('codex'), () => {
      reachingWith('anthropic', 'claude-sonnet-4-5');
      noteUnreadableRequest();
    });
    forget();

    expect(rows()).toMatchObject([{ origin: 'provider', status: 200 }]);
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

    expect(rows()).toHaveLength(1);
  });

  test('it hears no further row the gateway raised', async () => {
    const app = createGatewayApp(codex, grantsNothing, neverFetches);
    const { rows, forget } = collecting();

    await ask(app);
    forget();
    await ask(app);

    expect(rows()).toHaveLength(1);
  });
});
