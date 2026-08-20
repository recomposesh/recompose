import { describe, expect, test } from 'vitest';

import type { JudgeReading } from './outcome-classification';

import {
  JUDGE,
  NOW,
  aGatewayServing,
  aJudgeAnswering,
  aJudgedRouterOver,
} from './attempt-walk.testkit';
import { aRateLimit } from './routing.testkit';

function anElseThatRefuses() {
  return { catchall: aRateLimit(NOW + 20_000) };
}

async function aWalkWhoseJudgeNamedNoBranch(reading: JudgeReading) {
  const gateway = aGatewayServing(aJudgedRouterOver(), {
    classifyBranch: aJudgeAnswering(reading).classifyBranch,
  });

  return gateway.send(anElseThatRefuses());
}

describe('the account a walk gives when no judgment placed the request', () => {
  test('a judge that refused leaves its branch children reading as never judged', async () => {
    const walk = await aWalkWhoseJudgeNamedNoBranch({ heard: 'refusal' });

    expect(walk.notes).toStrictEqual([
      { routeNode: 'coder', reason: { because: 'unjudged' } },
      { routeNode: 'talker', reason: { because: 'unjudged' } },
      {
        routeNode: 'catchall',
        reason: { because: 'refused', status: 429 },
        retryAtMs: NOW + 20_000,
      },
    ]);
  });

  test('a judge past its budget reads the same way, since it named no branch either', async () => {
    const walk = await aWalkWhoseJudgeNamedNoBranch({ heard: 'timeout' });

    expect(walk.notes.map((note) => note.reason)).toEqual([
      { because: 'unjudged' },
      { because: 'unjudged' },
      { because: 'refused', status: 429 },
    ]);
  });

  test('a judge standing cooling reads the same way, with no call leaving the machine', async () => {
    const judge = aJudgeAnswering({ heard: 'answer', label: 'code' });
    const gateway = aGatewayServing(aJudgedRouterOver(), { classifyBranch: judge.classifyBranch });

    gateway.standDown(JUDGE, 60_000);
    const walk = await gateway.send(anElseThatRefuses());

    expect(judge.asked).toEqual([]);
    expect(walk.notes.at(0)).toStrictEqual({ routeNode: 'coder', reason: { because: 'unjudged' } });
  });

  test('a turn resuming server state that nobody pinned reads as never judged too', async () => {
    const gateway = aGatewayServing(aJudgedRouterOver(), { resumesServerState: true });

    const walk = await gateway.send(anElseThatRefuses());

    expect(walk.notes.at(0)).toStrictEqual({ routeNode: 'coder', reason: { because: 'unjudged' } });
  });

  test('the wait the child it did try named still rides on the refusal', async () => {
    const walk = await aWalkWhoseJudgeNamedNoBranch({ heard: 'refusal' });

    expect(walk.verdict).toStrictEqual({ outcome: 'exhausted', retryAtMs: NOW + 20_000 });
  });
});

describe('the account a walk gives when a judgment did place the request', () => {
  test('a conversation following its pin reads its other children as off the branch', async () => {
    const gateway = aGatewayServing(aJudgedRouterOver(), { pinnedBranchAt: () => 'coder' });

    const walk = await gateway.send({
      coder: aRateLimit(NOW + 30_000),
      catchall: aRateLimit(NOW + 20_000),
    });

    expect(walk.notes.at(1)).toStrictEqual({
      routeNode: 'talker',
      reason: { because: 'off-branch' },
    });
  });
});
