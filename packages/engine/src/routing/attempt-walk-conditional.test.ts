import { describe, expect, test } from 'vitest';

import { JUDGE, aGatewayServing, aJudgeAnswering, aJudgedRouterOver } from './attempt-walk.testkit';

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

  test('a judge refusal lands the request on else without asking a second time', async () => {
    const judge = aJudgeAnswering({ heard: 'refusal' }, { heard: 'answer', label: 'code' });
    const gateway = aGatewayServing(aJudgedRouterOver(), { classifyBranch: judge.classifyBranch });

    const walk = await gateway.send();

    expect(judge.asked).toEqual([JUDGE]);
    expect(walk.attempted).toEqual(['catchall']);
  });

  test('a judge past its budget lands the request on else without asking a second time', async () => {
    const judge = aJudgeAnswering({ heard: 'timeout' }, { heard: 'answer', label: 'code' });
    const gateway = aGatewayServing(aJudgedRouterOver(), { classifyBranch: judge.classifyBranch });

    const walk = await gateway.send();

    expect(judge.asked).toEqual([JUDGE]);
    expect(walk.attempted).toEqual(['catchall']);
  });

  test('a router with no way to reach its judge lands the request on else', async () => {
    const gateway = aGatewayServing(aJudgedRouterOver());

    const walk = await gateway.send();

    expect(walk.verdict).toEqual({
      outcome: 'answered',
      routeNode: 'catchall',
      answer: 'catchall',
    });
  });
});
