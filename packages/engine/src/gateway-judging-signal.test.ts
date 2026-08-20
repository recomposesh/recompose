import type { EngineRouting } from '@recompose/contracts';

import { afterEach, describe, expect, test } from 'vitest';

import type { JudgingReading } from './gateway-judging-watch';

import { judgedRouting } from './gateway-judging';
import { forgetJudgingInFlight, subscribeToJudging } from './gateway-judging-watch';
import { routingMemory } from './gateway-routing-memory';
import { subscriptionRuntime } from './subscription/reach';

const JUDGE = 'judge';

const ROUTER = 'r1';

const BRANCHES = [{ label: 'code', rule: 'asks to write or change code', child: 'coder' }];

const CROSSING = {
  dialect: 'chat-completions',
  raw: { model: 'fast', messages: [{ role: 'user', content: 'rename this function' }] },
  gatewayName: 'Codex',
  virtualModel: 'fast',
  providerModel: 'gpt-5-mini',
} as const;

const routing: EngineRouting = {
  entry: ROUTER,
  nodes: {
    [ROUTER]: {
      kind: 'router',
      policy: {
        mode: 'conditional',
        judge: JUDGE,
        elseChild: 'coder',
        branches: BRANCHES,
        rejudgeEveryRequest: false,
        judgeBoundMs: 2_000,
      },
      children: ['coder'],
    },
    [JUDGE]: { kind: 'target', standing: { standing: 'bound', providerModel: 'gpt-5-mini' } },
    coder: { kind: 'target', standing: { standing: 'bound', providerModel: 'gpt-5' } },
  },
};

afterEach(() => {
  forgetJudgingInFlight();
});

function sceneAnswering(answer: () => Response) {
  return {
    routing,
    slug: 'codex',
    virtualModel: 'fast',
    crossing: CROSSING,
    spendGrantFor: async () =>
      Promise.resolve({
        verdict: 'resolved' as const,
        providerOrigin: 'http://judge.test',
        spend: { custody: 'credentialed' as const, provider: 'openai', credential: 'sk-live-40d1' },
      }),
    fetchLike: async () => Promise.resolve(answer()),
    subscriptions: subscriptionRuntime(),
    memory: routingMemory(),
  };
}

async function readingsWhileJudging(answer: () => Response): Promise<JudgingReading[]> {
  const read: JudgingReading[] = [];
  const forget = subscribeToJudging((reading) => {
    read.push(reading);
  });

  await judgedRouting(sceneAnswering(answer)).classifyBranch(ROUTER, JUDGE, BRANCHES);
  forget();

  return read;
}

describe('what a router waiting on its judge tells the canvas', () => {
  test('the router says it is judging while the classification is in flight', async () => {
    const read = await readingsWhileJudging(() =>
      Response.json({ choices: [{ message: { content: 'code' } }] }),
    );

    expect(read.at(0)).toEqual({
      address: { slug: 'codex', virtualModel: 'fast', routeNode: ROUTER },
      judging: 1,
    });
  });

  test('the router says it waits on nothing once the classification settles', async () => {
    const read = await readingsWhileJudging(() =>
      Response.json({ choices: [{ message: { content: 'code' } }] }),
    );

    expect(read.at(-1)?.judging).toBe(0);
  });

  test('a judge that refused still leaves the router waiting on nothing', async () => {
    const read = await readingsWhileJudging(() => new Response('{}', { status: 429 }));

    expect(read.at(-1)?.judging).toBe(0);
  });

  test('the signal names the router rather than the judge, because the tie leaves the router', async () => {
    const read = await readingsWhileJudging(() =>
      Response.json({ choices: [{ message: { content: 'code' } }] }),
    );

    expect(read.map((reading) => reading.address.routeNode)).toEqual([ROUTER, ROUTER]);
  });

  test('a reading carries a place and a count, and no room for anything else', async () => {
    const read = await readingsWhileJudging(() =>
      Response.json({ choices: [{ message: { content: 'code' } }] }),
    );

    expect(read.map((reading) => Object.keys(reading).sort())).toEqual([
      ['address', 'judging'],
      ['address', 'judging'],
    ]);
    expect(read.map((reading) => Object.keys(reading.address).sort())).toEqual([
      ['routeNode', 'slug', 'virtualModel'],
      ['routeNode', 'slug', 'virtualModel'],
    ]);
  });

  test('neither the words the caller wrote nor the branch the judge named rides the signal', async () => {
    const read = await readingsWhileJudging(() =>
      Response.json({ choices: [{ message: { content: 'code' } }] }),
    );

    expect(JSON.stringify(read)).not.toContain('rename this function');
    expect(read.some((reading) => reading.address.routeNode === 'coder')).toBe(false);
  });
});
