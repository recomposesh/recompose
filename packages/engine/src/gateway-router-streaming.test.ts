import type { EngineVirtualModel } from '@recompose/contracts';

import { describe, expect, it } from 'vitest';

import type { Answering } from './gateway-router.testkit';

import { createGatewayApp } from './gateway-app';
import {
  aCredentialedGrant,
  aGatewayHolding,
  aVirtualModel,
  granting,
  neverFetches,
} from './gateway-app.testkit';
import {
  aRoutedModel,
  answeringInTurn,
  ASK,
  childRouteNode,
  ORIGIN,
  refusedWith,
  requestUrlOf,
  served,
  serving,
  streamOf,
} from './gateway-router.testkit';

const RATE_LIMIT_EVENT =
  'event: error\ndata: {"type":"error","error":{"type":"rate_limit_error","message":"slow"}}\n\n';

const OPENING_EVENT = 'data: {"type":"message_start","message":{"id":"msg_1"}}\n\n';

function twoChildren(): EngineVirtualModel {
  return aRoutedModel('failover', [
    { standing: 'bound', providerModel: 'gpt-5-mini' },
    { standing: 'bound', providerModel: 'claude-sonnet-4-5' },
  ]);
}

function droppingFirstConnection(): Answering {
  const sentTo: string[] = [];
  let at = 0;

  return {
    sentTo,
    fetchLike: async (input) => {
      sentTo.push(requestUrlOf(input));
      at += 1;

      return at === 1 ? Promise.reject(new Error('socket hang up')) : Promise.resolve(served());
    },
  };
}

describe('the first downstream byte commits the serving child', () => {
  it('fails over when the stream opens with an error event before any byte reaches the caller', async () => {
    const scene = serving(
      twoChildren(),
      answeringInTurn(() => streamOf(RATE_LIMIT_EVENT), served),
    );
    const answer = await scene.ask();

    expect(scene.sentTo).toHaveLength(2);
    expect(answer.status).toBe(200);
  });

  it('forwards a failure after the first byte and begins no sibling', async () => {
    const scene = serving(
      twoChildren(),
      answeringInTurn(() => streamOf(`${OPENING_EVENT}${RATE_LIMIT_EVENT}`)),
    );
    const answer = await scene.ask();
    const text = await answer.text();

    expect(scene.sentTo).toHaveLength(1);
    expect(text).toContain('"type":"error"');
  });

  it('fails over when the connection drops carrying no status at all', async () => {
    const scene = serving(twoChildren(), droppingFirstConnection());
    const answer = await scene.ask();

    expect(scene.sentTo).toHaveLength(2);
    expect(answer.status).toBe(200);
  });
});

describe('one request over two children paints both cables', () => {
  it('records the failed child beside the child that answered', async () => {
    const scene = serving(
      twoChildren(),
      answeringInTurn(() => refusedWith(429, { error: { message: 'slow' } }), served),
    );

    await (await scene.ask()).text();

    expect(scene.traffic['codex']?.['fast']?.[childRouteNode(1)]).toMatchObject({
      outcome: 'failed',
      status: 429,
    });
    expect(scene.traffic['codex']?.['fast']?.[childRouteNode(2)]).toMatchObject({
      outcome: 'served',
    });
  });
});

function aLoneTargetRefusing() {
  const grants = granting(aCredentialedGrant('http://only.test'));
  const answering = answeringInTurn(() => refusedWith(429, { error: { message: 'slow down' } }));
  const app = createGatewayApp(
    aGatewayHolding(aVirtualModel()),
    grants.grantFor,
    answering.fetchLike,
  );

  return {
    answering,
    ask: async () =>
      app.request(`${ORIGIN}/v1/messages`, { method: 'POST', body: JSON.stringify(ASK) }),
  };
}

describe('a lone target keeps every answer it gave before any router existed', () => {
  it('passes a rate limit straight through rather than inventing a router refusal', async () => {
    const answer = await aLoneTargetRefusing().ask();

    expect(answer.status).toBe(429);
    await expect(answer.text()).resolves.toBe('{"error":{"message":"slow down"}}');
  });

  it('reaches the provider again on the next request, because nothing cools a lone target', async () => {
    const lone = aLoneTargetRefusing();

    await (await lone.ask()).text();
    await (await lone.ask()).text();

    expect(lone.answering.sentTo).toHaveLength(2);
  });

  it('still names the missing credential rather than reporting an exhausted ladder', async () => {
    const grants = granting({ verdict: 'missing-credential' });
    const app = createGatewayApp(aGatewayHolding(aVirtualModel()), grants.grantFor, neverFetches);
    const answer = await app.request(`${ORIGIN}/v1/messages`, {
      method: 'POST',
      body: JSON.stringify(ASK),
    });

    expect(answer.status).toBe(502);
    await expect(answer.json()).resolves.toEqual({
      type: 'error',
      error: {
        type: 'api_error',
        message: 'The gateway "Codex" holds no credential for the virtual model "fast".',
      },
    });
  });
});
