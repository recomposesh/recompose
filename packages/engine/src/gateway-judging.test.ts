import type { EngineRouteNode, EngineRouting, SpendGrant } from '@recompose/contracts';

import { describe, expect, test } from 'vitest';

import type { JudgingScene } from './gateway-judging';
import type { Crossing } from './gateway-wire';

import { judgedRouting } from './gateway-judging';
import { requestUrlOf } from './gateway-router.testkit';
import { routingMemory } from './gateway-routing-memory';

const JUDGE = 'judge';

const LADDER = 'ladder';

const A_KEYED_JUDGE: SpendGrant = {
  verdict: 'resolved',
  providerOrigin: 'http://judge.test',
  spend: { custody: 'credentialed', provider: 'openai', credential: 'sk-live-40d1' },
};

function aBoundTarget(providerModel: string): EngineRouteNode {
  return { kind: 'target', standing: { standing: 'bound', providerModel } };
}

function aJudgedTable(judgeStanding: EngineRouteNode = aBoundTarget('gpt-5-nano')): EngineRouting {
  return {
    entry: LADDER,
    nodes: {
      [LADDER]: {
        kind: 'router',
        policy: {
          mode: 'conditional',
          judge: JUDGE,
          branches: [
            { label: 'code', rule: 'asks to write or change code', child: 'coder' },
            { label: 'chat', rule: 'small talk and questions', child: 'talker' },
          ],
          elseChild: 'catchall',
          judgeBoundMs: 2_000,
          rejudgeEveryRequest: false,
        },
        children: ['coder', 'talker', 'catchall'],
      },
      [JUDGE]: judgeStanding,
      coder: aBoundTarget('gpt-5-codex'),
      talker: aBoundTarget('gpt-5-mini'),
      catchall: aBoundTarget('gpt-5'),
    },
  };
}

const CROSSING: Crossing = {
  dialect: 'chat-completions',
  raw: { model: 'fast', messages: [{ role: 'user', content: 'rename this function' }] },
  gatewayName: 'Codex',
  virtualModel: 'fast',
  providerModel: 'gpt-5',
};

type Watched = { scene: JudgingScene; sentTo: string[]; askedFor: string[] };

function judging(routing: EngineRouting, answer: () => Response, grant = A_KEYED_JUDGE): Watched {
  const sentTo: string[] = [];
  const askedFor: string[] = [];

  return {
    sentTo,
    askedFor,
    scene: {
      routing,
      slug: 'codex',
      virtualModel: 'fast',
      crossing: CROSSING,
      spendGrantFor: async (_slug, _virtualModel, routeNode) => {
        askedFor.push(routeNode);

        return Promise.resolve(grant);
      },
      fetchLike: async (input) => {
        sentTo.push(requestUrlOf(input));

        return Promise.resolve(answer());
      },
      memory: routingMemory(),
    },
  };
}

const BRANCHES = [
  { label: 'code', rule: 'asks to write or change code', child: 'coder' },
  { label: 'chat', rule: 'small talk and questions', child: 'talker' },
];

describe('the judge a serving gateway hands the walk', () => {
  test('the classification goes out under the judge’s own account', async () => {
    const watched = judging(aJudgedTable(), () =>
      Response.json({ choices: [{ message: { content: 'code' } }] }),
    );
    const judged = judgedRouting(watched.scene);

    await expect(judged.classifyBranch(JUDGE, BRANCHES)).resolves.toEqual({
      heard: 'answer',
      label: 'code',
    });
    expect(watched.askedFor).toEqual([JUDGE]);
    expect(watched.sentTo).toEqual(['http://judge.test/v1/chat/completions']);
  });

  test('the judge answers under the model its own node was bound to', async () => {
    const watched = judging(aJudgedTable(), () =>
      Response.json({ choices: [{ message: { content: 'code' } }] }),
    );

    await judgedRouting(watched.scene).classifyBranch(JUDGE, BRANCHES);

    expect(watched.sentTo).toHaveLength(1);
  });
});

describe('the judge a serving gateway cannot seat at all', () => {
  test('a judge the table stands unbound is never asked for a credential', async () => {
    const watched = judging(
      aJudgedTable({ kind: 'target', standing: { standing: 'removed' } }),
      () => Response.json({}),
    );

    await expect(judgedRouting(watched.scene).classifyBranch(JUDGE, BRANCHES)).resolves.toEqual({
      heard: 'refusal',
    });
    expect(watched.askedFor).toEqual([]);
    expect(watched.sentTo).toEqual([]);
  });

  test('a judge no conditional router in this table names reads as a refusal, not a silence', async () => {
    const watched = judging(aJudgedTable(), () => Response.json({}));

    await expect(
      judgedRouting(watched.scene).classifyBranch('stranger', BRANCHES),
    ).resolves.toEqual({ heard: 'refusal' });
    expect(watched.sentTo).toEqual([]);
  });

  test('a judge no router names costs neither a credential nor a stand-down', async () => {
    const watched = judging(aJudgedTable(), () => Response.json({}));

    await judgedRouting(watched.scene).classifyBranch('stranger', BRANCHES);

    expect(watched.askedFor).toEqual([]);
    expect(
      watched.scene.memory.ledger.coolingAt({
        slug: 'codex',
        virtualModel: 'fast',
        routeNode: 'stranger',
      }),
    ).toBeUndefined();
  });
});

describe('the judge a serving gateway stands down', () => {
  test('a refused judge stands down, so the next request spends no call on it', async () => {
    const watched = judging(aJudgedTable(), () => new Response('{}', { status: 429 }));
    const judged = judgedRouting(watched.scene);

    await judged.classifyBranch(JUDGE, BRANCHES);

    expect(
      watched.scene.memory.ledger.coolingAt({
        slug: 'codex',
        virtualModel: 'fast',
        routeNode: JUDGE,
      }),
    ).toBeDefined();
  });
});

describe('the conversation a serving gateway pins a branch for', () => {
  test('a branch pinned for one request reads back for the next one like it', () => {
    const watched = judging(aJudgedTable(), () => Response.json({}));
    const judged = judgedRouting(watched.scene);

    judged.pinBranchAt(LADDER, 'coder');

    expect(judged.pinnedBranchAt(LADDER)).toBe('coder');
  });

  test('a second conversation reads none of the first one’s pins', () => {
    const watched = judging(aJudgedTable(), () => Response.json({}));
    const first = judgedRouting(watched.scene);
    const second = judgedRouting({
      ...watched.scene,
      crossing: {
        ...CROSSING,
        raw: { model: 'fast', messages: [{ role: 'user', content: 'hi' }] },
      },
    });

    first.pinBranchAt(LADDER, 'coder');

    expect(second.pinnedBranchAt(LADDER)).toBeUndefined();
  });

  test('a later turn of the same conversation reads the branch its first turn earned', () => {
    const watched = judging(aJudgedTable(), () => Response.json({}));
    const opening = judgedRouting(watched.scene);
    const later = judgedRouting({
      ...watched.scene,
      crossing: {
        ...CROSSING,
        raw: {
          model: 'fast',
          messages: [
            { role: 'user', content: 'rename this function' },
            { role: 'assistant', content: 'done' },
            { role: 'user', content: 'now add a test' },
          ],
        },
      },
    });

    opening.pinBranchAt(LADDER, 'coder');

    expect(later.pinnedBranchAt(LADDER)).toBe('coder');
  });
});
