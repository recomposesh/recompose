import type { EngineRouteNode, EngineVirtualModel, RouterPolicy } from '@recompose/contracts';

import { describe, expect, it } from 'vitest';

import { answeringInTurn, childRouteNode, served, serving } from './gateway-router.testkit';

const ENTRY = 'ladder';

const NESTED = 'spread';

const JUDGE = 'judge';

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

const RESUMED = {
  model: 'fast',
  messages: [
    { role: 'user', content: 'hello' },
    {
      role: 'assistant',
      content: [{ type: 'thinking', thinking: 'weighing it', signature: 'ErUBCkYIB' }],
    },
    { role: 'user', content: 'and then?' },
  ],
};

const ELSEWHERE = { model: 'fast', messages: [{ role: 'user', content: 'a different opening' }] };

function aFailoverOverANested(
  policy: RouterPolicy,
  beside: Readonly<Record<string, EngineRouteNode>> = {},
): EngineVirtualModel {
  return {
    id: 'fast',
    displayName: 'Fast',
    routing: {
      entry: ENTRY,
      nodes: {
        [ENTRY]: { kind: 'router', policy: { mode: 'failover' }, children: [NESTED] },
        [NESTED]: {
          kind: 'router',
          policy,
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
        ...beside,
      },
    },
  };
}

function aFailoverOverAJudged(): EngineVirtualModel {
  return aFailoverOverANested(
    {
      mode: 'conditional',
      judge: JUDGE,
      branches: [{ label: 'code', rule: 'asks to write code', child: childRouteNode(1) }],
      elseChild: childRouteNode(2),
      judgeBoundMs: 2_000,
      rejudgeEveryRequest: false,
    },
    { [JUDGE]: { kind: 'target', standing: { standing: 'bound', providerModel: 'gpt-5-mini' } } },
  );
}

describe('a chained turn refuses at the router that would rotate it, however deep it stands', () => {
  it('refuses under a round-robin nested below a failover entry', async () => {
    const scene = serving(aFailoverOverANested({ mode: 'round-robin' }), answeringInTurn(served));
    const answer = await scene.ask(RESUMING);

    expect(answer.status).toBe(400);
    expect(scene.sentTo).toHaveLength(0);
  });

  it('names the nested router and the two ways out', async () => {
    const scene = serving(aFailoverOverANested({ mode: 'round-robin' }), answeringInTurn(served));
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
    const scene = serving(aFailoverOverANested({ mode: 'failover' }), answeringInTurn(served));
    const answer = await scene.ask(RESUMING);

    expect(answer.status).toBe(200);
    expect(scene.sentTo).toEqual([`${FIRST_CHILD}/v1/chat/completions`]);
  });

  it('never refuses that turn at a conditional router, carrying it down else instead', async () => {
    const scene = serving(aFailoverOverAJudged(), answeringInTurn(served));
    const answer = await scene.ask(RESUMING);

    expect(answer.status).toBe(200);
    expect(scene.sentTo).toEqual([`${SECOND_CHILD}/v1/chat/completions`]);
  });
});

describe('the account a conversation keeps once a round-robin router has spread it', () => {
  it('carries a resumed turn back to the account its opening turn spread to', async () => {
    const scene = serving(aFailoverOverANested({ mode: 'round-robin' }), answeringInTurn(served));

    await (await scene.ask(OPENING)).text();
    const answer = await scene.ask(RESUMED);

    expect(answer.status).toBe(200);
    expect(scene.sentTo).toEqual([
      `${FIRST_CHILD}/v1/chat/completions`,
      `${FIRST_CHILD}/v1/chat/completions`,
    ]);
  });

  it('keeps spreading the conversations beside the one holding its account', async () => {
    const scene = serving(aFailoverOverANested({ mode: 'round-robin' }), answeringInTurn(served));

    await (await scene.ask(OPENING)).text();
    await (await scene.ask(ELSEWHERE)).text();
    await (await scene.ask(RESUMED)).text();

    expect(scene.sentTo).toEqual([
      `${FIRST_CHILD}/v1/chat/completions`,
      `${SECOND_CHILD}/v1/chat/completions`,
      `${FIRST_CHILD}/v1/chat/completions`,
    ]);
  });
});

describe('what a spreading router keeps for a request wearing no conversation of its own', () => {
  it('keeps no account for a request it cannot tell apart from the next one', async () => {
    const scene = serving(aFailoverOverANested({ mode: 'round-robin' }), answeringInTurn(served));
    const blank = { model: 'fast', messages: [{ role: 'user', content: '   ' }] };
    const resumedBlank = {
      model: 'fast',
      messages: [
        { role: 'user', content: '   ' },
        {
          role: 'assistant',
          content: [{ type: 'thinking', thinking: 'weighing it', signature: 'ErUBCkYIB' }],
        },
        { role: 'user', content: 'and then?' },
      ],
    };

    await (await scene.ask(blank)).text();
    const answer = await scene.ask(resumedBlank);

    expect(answer.status).toBe(400);
    expect(scene.sentTo).toHaveLength(1);
  });

  it('lets a turn that resumes nothing rotate across the nested round-robin', async () => {
    const scene = serving(aFailoverOverANested({ mode: 'round-robin' }), answeringInTurn(served));

    await (await scene.ask(OPENING)).text();
    await (await scene.ask(OPENING)).text();

    expect(scene.sentTo).toEqual([
      `${FIRST_CHILD}/v1/chat/completions`,
      `${SECOND_CHILD}/v1/chat/completions`,
    ]);
  });
});
