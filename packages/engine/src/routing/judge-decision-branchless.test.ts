import type { RouterPolicy } from '@recompose/contracts';

import { describe, expect, test } from 'vitest';

import type { JudgeReading } from './outcome-classification';

import { branchTheWalkFollows } from './judge-decision';

const ELSE_CHILD = 'catchall';

describe('a conditional router carrying no branches', () => {
  const noBranches: RouterPolicy = {
    mode: 'conditional',
    judge: 'judge-node',
    branches: [],
    elseChild: ELSE_CHILD,
    judgeBoundMs: 3000,
    rejudgeEveryRequest: false,
  };

  function judgingThatWouldBeAsked() {
    let asked = 0;

    return {
      asked: () => asked,
      judging: {
        classify: async () => {
          asked += 1;

          return Promise.resolve<JudgeReading>({ heard: 'timeout' });
        },
        judgeStandsCooling: () => false,
        pinnedBranchAt: () => undefined,
        pinBranchAt: () => undefined,
        resumesServerState: false,
        decided: new Map(),
      },
    };
  }

  test('hands the request to its else child, because nothing else could be chosen', async () => {
    const { judging } = judgingThatWouldBeAsked();

    await expect(branchTheWalkFollows('router-node', noBranches, judging)).resolves.toEqual({
      decided: ELSE_CHILD,
      elseChild: ELSE_CHILD,
      judged: true,
    });
  });

  test('spends no judge call to learn what only one child could answer', async () => {
    const { asked, judging } = judgingThatWouldBeAsked();

    await branchTheWalkFollows('router-node', noBranches, judging);

    expect(asked()).toBe(0);
  });

  test('reads as judged, so the walk carries on rather than refusing the request', async () => {
    const { judging } = judgingThatWouldBeAsked();
    const followed = await branchTheWalkFollows('router-node', noBranches, judging);

    expect(followed?.judged).toBe(true);
  });
});
