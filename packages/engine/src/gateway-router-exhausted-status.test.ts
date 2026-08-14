import type { EngineVirtualModel } from '@recompose/contracts';

import { describe, expect, it } from 'vitest';

import {
  answeringInTurn,
  aRoutedModel,
  refusedWith,
  served,
  serving,
} from './gateway-router.testkit';

const A_MINUTE = 60_000;

function twoChildren(): EngineVirtualModel {
  return aRoutedModel('failover', [
    { standing: 'bound', providerModel: 'gpt-5-mini' },
    { standing: 'bound', providerModel: 'claude-sonnet-4-5' },
  ]);
}

function aWindowReopeningIn(span: number): Record<string, string> {
  return { 'anthropic-ratelimit-requests-reset': new Date(Date.now() + span).toISOString() };
}

describe('a pool downed by dead upstreams is not a rate limit', () => {
  it('answers 502 when every child fell over with a 5xx, whatever its windows report', async () => {
    const scene = serving(
      twoChildren(),
      answeringInTurn(() => refusedWith(500, { error: 'boom' }, aWindowReopeningIn(A_MINUTE))),
    );
    const answer = await scene.ask();

    expect(answer.status).toBe(502);
    expect(answer.headers.get('retry-after')).toBeNull();
  });

  it('answers 429 with the wait when every child promised one in Retry-After', async () => {
    const scene = serving(
      twoChildren(),
      answeringInTurn(() => refusedWith(429, { error: 'slow' }, { 'retry-after': '30' })),
    );
    const answer = await scene.ask();

    expect(answer.status).toBe(429);
    expect(answer.headers.get('retry-after')).toBe('30');
  });
});

describe('a rate-limit window still says how long a refused child stands down', () => {
  it('skips the child whose window has not reopened and serves from its sibling', async () => {
    const scene = serving(
      twoChildren(),
      answeringInTurn(
        () => refusedWith(429, { error: 'slow' }, aWindowReopeningIn(A_MINUTE)),
        served,
      ),
    );

    await (await scene.ask()).text();
    await (await scene.ask()).text();

    expect(scene.sentTo).toEqual([
      'http://first.test/v1/chat/completions',
      'http://second.test/v1/chat/completions',
      'http://second.test/v1/chat/completions',
    ]);
  });
});
