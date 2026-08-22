import { describe, expect, test } from 'vitest';

import { JUDGE, aGatewayServing, aJudgeAnswering, aJudgedRouterOver } from './attempt-walk.testkit';
import { aRateLimit } from './routing.testkit';

describe('the branch a conditional router sends one request down', () => {
  test('the child behind the label the judge answered receives the request', async () => {
    const judge = aJudgeAnswering({ heard: 'answer', label: 'code' });
    const gateway = aGatewayServing(aJudgedRouterOver(), { classifyBranch: judge.classifyBranch });

    const walk = await gateway.send();

    expect(walk.verdict).toEqual({ outcome: 'answered', routeNode: 'coder', answer: 'coder' });
    expect(judge.asked).toEqual([JUDGE]);
  });

  test('a second label reaches the child behind its own branch', async () => {
    const judge = aJudgeAnswering({ heard: 'answer', label: 'chat' });
    const gateway = aGatewayServing(aJudgedRouterOver(), { classifyBranch: judge.classifyBranch });

    const walk = await gateway.send();

    expect(walk.attempted).toEqual(['talker']);
  });

  test('the judge itself never receives the request it classified', async () => {
    const judge = aJudgeAnswering({ heard: 'answer', label: 'code' });
    const gateway = aGatewayServing(aJudgedRouterOver(), { classifyBranch: judge.classifyBranch });

    const walk = await gateway.send();

    expect(walk.attempted).not.toContain(JUDGE);
    expect(walk.notes).toEqual([]);
  });
});

describe('the answers a conditional router asks its judge twice about', () => {
  test('an answer naming no branch lands on else after exactly one more ask', async () => {
    const judge = aJudgeAnswering(
      { heard: 'answer', label: 'weather' },
      { heard: 'answer', label: 'weather' },
    );
    const gateway = aGatewayServing(aJudgedRouterOver(), { classifyBranch: judge.classifyBranch });

    const walk = await gateway.send();

    expect(judge.asked).toEqual([JUDGE, JUDGE]);
    expect(walk.attempted).toEqual(['catchall']);
  });

  test('a second ask that does name a branch reaches that branch', async () => {
    const judge = aJudgeAnswering(
      { heard: 'answer', label: 'else' },
      { heard: 'answer', label: 'chat' },
    );
    const gateway = aGatewayServing(aJudgedRouterOver(), { classifyBranch: judge.classifyBranch });

    const walk = await gateway.send();

    expect(walk.attempted).toEqual(['talker']);
  });

  test('a judge refusal refuses the request without asking a second time', async () => {
    const judge = aJudgeAnswering({ heard: 'refusal' }, { heard: 'answer', label: 'code' });
    const gateway = aGatewayServing(aJudgedRouterOver(), { classifyBranch: judge.classifyBranch });

    const walk = await gateway.send();

    expect(judge.asked).toEqual([JUDGE]);
    expect(walk.verdict).toMatchObject({ outcome: 'unjudged', routeNode: 'ladder' });
  });

  test('a judge past its budget refuses the request without asking a second time', async () => {
    const judge = aJudgeAnswering({ heard: 'timeout' }, { heard: 'answer', label: 'code' });
    const gateway = aGatewayServing(aJudgedRouterOver(), { classifyBranch: judge.classifyBranch });

    const walk = await gateway.send();

    expect(judge.asked).toEqual([JUDGE]);
    expect(walk.verdict).toMatchObject({ outcome: 'unjudged', routeNode: 'ladder' });
  });

  test('a router with no way to reach its judge refuses rather than falling to else', async () => {
    const gateway = aGatewayServing(aJudgedRouterOver());

    const walk = await gateway.send();

    expect(walk.verdict).toMatchObject({ outcome: 'unjudged', routeNode: 'ladder' });
  });
});

describe('the judge a conditional router refuses to call', () => {
  test('a judge standing cooling refuses the request with no call leaving the machine', async () => {
    const judge = aJudgeAnswering({ heard: 'answer', label: 'code' });
    const gateway = aGatewayServing(aJudgedRouterOver(), { classifyBranch: judge.classifyBranch });

    gateway.standDown(JUDGE, 60_000);
    const walk = await gateway.send();

    expect(judge.asked).toEqual([]);
    expect(walk.attempted).toEqual([]);
  });

  test('a judge whose cooling ran out classifies the next request again', async () => {
    const judge = aJudgeAnswering({ heard: 'answer', label: 'code' });
    const gateway = aGatewayServing(aJudgedRouterOver(), { classifyBranch: judge.classifyBranch });

    gateway.standDown(JUDGE, 60_000);
    gateway.tick(60_001);
    const walk = await gateway.send();

    expect(judge.asked).toEqual([JUDGE]);
    expect(walk.attempted).toEqual(['coder']);
  });

  test('a cooling judge stands none of its branch children down alongside it', async () => {
    const judge = aJudgeAnswering({ heard: 'answer', label: 'code' });
    const gateway = aGatewayServing(aJudgedRouterOver(), { classifyBranch: judge.classifyBranch });

    gateway.standDown(JUDGE, 60_000);
    const walk = await gateway.send();

    expect(gateway.cooling('coder')).toBeUndefined();
    expect(walk.verdict).toMatchObject({ outcome: 'unjudged', routeNode: 'ladder' });
  });
});

describe('the one classification a walk spends, however many children it tries', () => {
  test('a branch child that refuses never sends the walk back to its judge', async () => {
    const judge = aJudgeAnswering({ heard: 'answer', label: 'code' });
    const gateway = aGatewayServing(aJudgedRouterOver(), { classifyBranch: judge.classifyBranch });

    await gateway.send({ coder: aRateLimit() });

    expect(judge.asked).toEqual([JUDGE]);
  });

  test('a walk that runs out of children entirely still asked its judge once', async () => {
    const judge = aJudgeAnswering({ heard: 'answer', label: 'code' });
    const gateway = aGatewayServing(aJudgedRouterOver(), { classifyBranch: judge.classifyBranch });

    const walk = await gateway.send({ coder: aRateLimit(), catchall: aRateLimit() });

    expect(judge.asked).toEqual([JUDGE]);
    expect(walk.verdict.outcome).toBe('exhausted');
  });

  test('a decided branch that cannot serve falls to else without asking again', async () => {
    const judge = aJudgeAnswering({ heard: 'answer', label: 'code' });
    const gateway = aGatewayServing(aJudgedRouterOver(), { classifyBranch: judge.classifyBranch });

    const walk = await gateway.send({ coder: aRateLimit() });

    expect(walk.attempted).toEqual(['coder', 'catchall']);
    expect(judge.asked).toEqual([JUDGE]);
  });

  test('a branch child already standing cooling never receives the request at all', async () => {
    const judge = aJudgeAnswering({ heard: 'answer', label: 'code' });
    const gateway = aGatewayServing(aJudgedRouterOver(), { classifyBranch: judge.classifyBranch });

    await gateway.send({ coder: aRateLimit() });
    const next = await gateway.send();

    expect(next.attempted).toEqual(['catchall']);
  });

  test('a later walk judges again, because the memo dies with the walk that made it', async () => {
    const judge = aJudgeAnswering({ heard: 'answer', label: 'code' });
    const gateway = aGatewayServing(aJudgedRouterOver(), { classifyBranch: judge.classifyBranch });

    await gateway.send();
    await gateway.send();

    expect(judge.asked).toEqual([JUDGE, JUDGE]);
  });
});
