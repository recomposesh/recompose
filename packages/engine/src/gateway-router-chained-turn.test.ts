import type { EngineVirtualModel, RouterPolicy } from '@recompose/contracts';

import { describe, expect, it } from 'vitest';

import { answeringInTurn, childRouteNode, served, serving } from './gateway-router.testkit';

const ENTRY = 'ladder';

const NESTED = 'spread';

const FIRST_CHILD = 'http://first.test';

const SECOND_CHILD = 'http://second.test';

const RESUMING = {
  model: 'fast',
  messages: [
    {
      role: 'assistant',
      content: [{ type: 'thinking', thinking: 'weighing it', signature: 'ErUBCkYIB' }],
    },
    { role: 'user', content: 'and then?' },
  ],
};

const OPENING = { model: 'fast', messages: [{ role: 'user', content: 'hello' }] };

function aFailoverOverANested(mode: RouterPolicy['mode']): EngineVirtualModel {
  return {
    id: 'fast',
    displayName: 'Fast',
    routing: {
      entry: ENTRY,
      nodes: {
        [ENTRY]: { kind: 'router', policy: { mode: 'failover' }, children: [NESTED] },
        [NESTED]: {
          kind: 'router',
          policy: { mode },
          children: [childRouteNode(1), childRouteNode(2)],
        },
        [childRouteNode(1)]: {
          kind: 'target',
          standing: { standing: 'bound', providerModel: 'gpt-5-mini' },
        },
        [childRouteNode(2)]: {
          kind: 'target',
          standing: { standing: 'bound', providerModel: 'claude-sonnet-4-5' },
        },
      },
    },
  };
}

describe('a chained turn refuses at the router that would rotate it, however deep it stands', () => {
  it('refuses under a round-robin nested below a failover entry', async () => {
    const scene = serving(aFailoverOverANested('round-robin'), answeringInTurn(served));
    const answer = await scene.ask(RESUMING);

    expect(answer.status).toBe(400);
    expect(scene.sentTo).toHaveLength(0);
  });

  it('names the nested router and the two ways out', async () => {
    const scene = serving(aFailoverOverANested('round-robin'), answeringInTurn(served));
    const answer = await scene.ask(RESUMING);

    await expect(answer.json()).resolves.toMatchObject({
      error: {
        type: 'invalid_request_error',
        message:
          'The router "Round-robin" in the gateway "Codex" spreads requests across accounts, so it cannot carry a turn that resumes server-side state for the virtual model "fast". Switch this router to failover, or start a conversation that doesn\'t resume server-side state.',
      },
    });
  });

  it('serves a chained turn where every router in the way fails over instead', async () => {
    const scene = serving(aFailoverOverANested('failover'), answeringInTurn(served));
    const answer = await scene.ask(RESUMING);

    expect(answer.status).toBe(200);
    expect(scene.sentTo).toEqual([`${FIRST_CHILD}/v1/chat/completions`]);
  });

  it('lets a turn that resumes nothing rotate across the nested round-robin', async () => {
    const scene = serving(aFailoverOverANested('round-robin'), answeringInTurn(served));

    await (await scene.ask(OPENING)).text();
    await (await scene.ask(OPENING)).text();

    expect(scene.sentTo).toEqual([
      `${FIRST_CHILD}/v1/chat/completions`,
      `${SECOND_CHILD}/v1/chat/completions`,
    ]);
  });
});
