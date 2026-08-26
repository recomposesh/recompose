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

async function aWalkWhoseJudgeNamedNoBranch(...readings: readonly JudgeReading[]) {
  const gateway = aGatewayServing(aJudgedRouterOver(), {
    classifyBranch: aJudgeAnswering(...readings).classifyBranch,
  });

  return gateway.send();
}

describe('what a walk does when the judge it asked reached no verdict', () => {
  test('a judge call that failed leaves the request refused at the router that asked it', async () => {
    const walk = await aWalkWhoseJudgeNamedNoBranch({ heard: 'refusal' });

    expect(walk.verdict).toMatchObject({
      outcome: 'unjudged',
      routeNode: 'ladder',
      because: 'judge-call-failed',
    });
    expect(walk.attempted).toEqual([]);
  });

  test('a judge past its budget reads the same way, since it named no branch either', async () => {
    const walk = await aWalkWhoseJudgeNamedNoBranch({ heard: 'timeout' });

    expect(walk.verdict).toMatchObject({
      outcome: 'unjudged',
      routeNode: 'ladder',
      because: 'judge-timed-out',
    });
  });

  test('the else child carries none of it, however ready it stood', async () => {
    const walk = await aWalkWhoseJudgeNamedNoBranch({ heard: 'refusal' });

    expect(walk.attempted).not.toContain('catchall');
  });

  test('a second ask that ran out of budget names the budget rather than the first answer', async () => {
    const walk = await aWalkWhoseJudgeNamedNoBranch(
      { heard: 'answer', label: 'weather' },
      { heard: 'timeout' },
    );

    expect(walk.verdict).toMatchObject({ outcome: 'unjudged', because: 'judge-timed-out' });
  });

  test('the refusal names the router that asked rather than promising a time to come back', async () => {
    const walk = await aWalkWhoseJudgeNamedNoBranch({ heard: 'refusal' });

    expect(walk.verdict).not.toHaveProperty('retryAtMs');
  });
});

describe('what a walk does when it never asked a judge at all', () => {
  test('a judge standing cooling refuses too, with no call leaving the machine', async () => {
    const judge = aJudgeAnswering({ heard: 'answer', label: 'code' });
    const gateway = aGatewayServing(aJudgedRouterOver(), { classifyBranch: judge.classifyBranch });

    gateway.standDown(JUDGE, 60_000);
    const walk = await gateway.send();

    expect(judge.asked).toEqual([]);
    expect(walk.verdict).toMatchObject({
      outcome: 'unjudged',
      routeNode: 'ladder',
      because: 'judge-standing-cooling',
    });
  });

  test('a turn resuming server state that nobody pinned is refused rather than routed', async () => {
    const gateway = aGatewayServing(aJudgedRouterOver(), { resumesServerState: true });

    const walk = await gateway.send();

    expect(walk.verdict).toMatchObject({
      outcome: 'unjudged',
      routeNode: 'ladder',
      because: 'unpinned-sealed-turn',
    });
    expect(walk.attempted).toEqual([]);
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
