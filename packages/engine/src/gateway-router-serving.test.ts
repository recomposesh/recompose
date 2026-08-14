import type { EngineVirtualModel } from '@recompose/contracts';

import { describe, expect, it } from 'vitest';

import { createGatewayApp } from './gateway-app';
import { aCredentialedGrant, aGatewayHolding, granting, neverFetches } from './gateway-app.testkit';
import {
  aRoutedModel,
  answeringInTurn,
  ASK,
  childRouteNode,
  ORIGIN,
  refusedWith,
  ROUTER_ROUTE_NODE,
  served,
  serving,
} from './gateway-router.testkit';

function twoChildren(mode: 'failover' | 'round-robin' = 'failover'): EngineVirtualModel {
  return aRoutedModel(mode, [
    { standing: 'bound', providerModel: 'gpt-5-mini' },
    { standing: 'bound', providerModel: 'claude-sonnet-4-5' },
  ]);
}

function anEmptyRouter(): EngineVirtualModel {
  return {
    id: 'fast',
    displayName: 'Fast',
    routing: {
      entry: ROUTER_ROUTE_NODE,
      nodes: {
        [ROUTER_ROUTE_NODE]: { kind: 'router', policy: { mode: 'failover' }, children: [] },
      },
    },
  };
}

const overloaded = () => refusedWith(503, { error: { message: 'overloaded' } });

describe('failover hands a curable refusal to the next child in declared order', () => {
  it('hands a rate-limited first target on to the next, and the answer travels back', async () => {
    const scene = serving(
      twoChildren(),
      answeringInTurn(() => refusedWith(429, { error: { message: 'slow down' } }), served),
    );
    const answer = await scene.ask();

    expect(scene.sentTo).toHaveLength(2);
    expect(scene.sentTo.at(1)).toContain('second.test');
    expect(answer.status).toBe(200);
  });

  it('cools the one child whose credential failed and lets its sibling answer', async () => {
    const scene = serving(twoChildren(), answeringInTurn(served), {
      [childRouteNode(1)]: { verdict: 'missing-credential' },
    });
    const answer = await scene.ask();

    expect(scene.sentTo).toEqual([expect.stringContaining('second.test')]);
    expect(answer.status).toBe(200);
  });

  it('hands the request to the sibling when the first child account left the registry', async () => {
    const scene = serving(twoChildren(), answeringInTurn(served), {
      [childRouteNode(1)]: { verdict: 'missing-target' },
    });
    const answer = await scene.ask();

    expect(scene.sentTo).toEqual([expect.stringContaining('second.test')]);
    expect(answer.status).toBe(200);
  });

  it('attempts each child exactly once and answers one refusal', async () => {
    const scene = serving(twoChildren(), answeringInTurn(overloaded));
    const answer = await scene.ask();

    expect(scene.sentTo).toHaveLength(2);
    expect(answer.status).toBe(502);
  });
});

describe('a seat the table already stands unbound', () => {
  it('hands the request to a sibling without asking main for a credential', async () => {
    const scene = serving(
      aRoutedModel('failover', [
        { standing: 'removed' },
        { standing: 'bound', providerModel: 'claude-sonnet-4-5' },
      ]),
      answeringInTurn(served),
    );
    const answer = await scene.ask();

    expect(scene.asked.map((ask) => ask.routeNode)).toEqual([childRouteNode(2)]);
    expect(scene.sentTo).toEqual([expect.stringContaining('second.test')]);
    expect(answer.status).toBe(200);
  });

  it('reads as a missing target, the same words a grant answers for the same seat', async () => {
    const scene = serving(
      aRoutedModel('failover', [{ standing: 'removed' }, { standing: 'removed' }]),
      answeringInTurn(served),
    );
    const answer = await scene.ask();
    const body: unknown = await answer.json();

    expect(answer.status).toBe(502);
    expect(scene.asked).toEqual([]);
    expect(JSON.stringify(body)).toContain('child-1 has no target');
    expect(JSON.stringify(body)).toContain('child-2 has no target');
  });
});

describe('a refusal the request itself earned ends the walk at the first child', () => {
  it('stops at the first target when the request is malformed', async () => {
    const scene = serving(
      twoChildren(),
      answeringInTurn(() => refusedWith(400, { error: { message: 'bad tool schema' } })),
    );
    const answer = await scene.ask();

    expect(scene.sentTo).toHaveLength(1);
    expect(answer.status).toBe(400);
  });

  it('hands that refusal back byte for byte, because recompose did not write it', async () => {
    const scene = serving(
      twoChildren(),
      answeringInTurn(() => refusedWith(400, { error: { message: 'bad tool schema' } })),
    );
    const answer = await scene.ask();

    await expect(answer.text()).resolves.toBe('{"error":{"message":"bad tool schema"}}');
  });
});

describe('an exhausted ladder accounts for itself in the refusal it answers', () => {
  it('names every child it tried, with the reason each could not serve', async () => {
    const scene = serving(twoChildren(), answeringInTurn(overloaded));
    const body: unknown = await (await scene.ask()).json();

    expect(JSON.stringify(body)).toContain('gpt-5-mini refused with 503');
    expect(JSON.stringify(body)).toContain('claude-sonnet-4-5 refused with 503');
  });

  it('says a child had no target rather than blaming the gateway for the ladder', async () => {
    const scene = serving(twoChildren(), answeringInTurn(served), {
      [childRouteNode(1)]: { verdict: 'missing-target' },
      [childRouteNode(2)]: { verdict: 'missing-target' },
    });
    const answer = await scene.ask();
    const body: unknown = await answer.json();

    expect(answer.status).toBe(502);
    expect(scene.sentTo).toEqual([]);
    expect(JSON.stringify(body)).toContain('gpt-5-mini has no target');
    expect(JSON.stringify(body)).toContain('claude-sonnet-4-5 has no target');
  });

  it('answers 429 with a wait when every child it tried promised one', async () => {
    const scene = serving(
      twoChildren(),
      answeringInTurn(() =>
        refusedWith(429, { error: { message: 'slow' } }, { 'retry-after': '20' }),
      ),
    );
    const answer = await scene.ask();

    expect(answer.status).toBe(429);
    expect(Number(answer.headers.get('retry-after'))).toBeLessThanOrEqual(20);
  });
});

describe('round-robin spreads requests across the children', () => {
  it('sends two requests to two different targets', async () => {
    const scene = serving(twoChildren('round-robin'), answeringInTurn(served));

    await scene.ask();
    await scene.ask();

    expect(scene.sentTo.at(0)).toContain('first.test');
    expect(scene.sentTo.at(1)).toContain('second.test');
  });

  it('skips a child standing cooling from an earlier rate limit', async () => {
    const scene = serving(
      twoChildren('round-robin'),
      answeringInTurn(() => refusedWith(429, { error: { message: 'slow' } }), served, served),
    );

    await scene.ask();

    const before = scene.sentTo.length;

    await scene.ask();

    expect(scene.sentTo.slice(before)).toEqual([expect.stringContaining('second.test')]);
  });
});

describe('a turn that resumes state one account holds never rotates', () => {
  it('refuses a chained turn under round-robin rather than spreading it', async () => {
    const scene = serving(twoChildren('round-robin'), answeringInTurn(served));
    const answer = await scene.ask({ ...ASK, previous_response_id: 'resp_8f21' });

    expect(answer.status).toBe(400);
    expect(scene.sentTo).toHaveLength(0);
  });

  it('serves a chained turn under failover, in declared order, unchanged', async () => {
    const scene = serving(twoChildren(), answeringInTurn(served));
    const answer = await scene.ask({ ...ASK, previous_response_id: 'resp_8f21' });

    expect(answer.status).toBe(200);
    expect(scene.sentTo.at(0)).toContain('first.test');
  });
});

describe('a router holding no child refuses rather than answering', () => {
  it('refuses before any request leaves the machine', async () => {
    const grants = granting(aCredentialedGrant());
    const app = createGatewayApp(aGatewayHolding(anEmptyRouter()), grants.grantFor, neverFetches);
    const answer = await app.request(`${ORIGIN}/v1/messages`, {
      method: 'POST',
      body: JSON.stringify(ASK),
    });
    const body: unknown = await answer.json();

    expect(answer.status).toBe(502);
    expect(JSON.stringify(body)).toContain('holds no child');
  });
});
