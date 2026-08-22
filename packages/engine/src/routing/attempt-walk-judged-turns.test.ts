import { describe, expect, test } from 'vitest';

import { JUDGE, aGatewayServing, aJudgeAnswering, aJudgedRouterOver } from './attempt-walk.testkit';

describe('the branch a turn that resumes server-side state keeps', () => {
  test('a pinned conversation follows its pin with no call leaving the machine', async () => {
    const judge = aJudgeAnswering({ heard: 'answer', label: 'code' });
    const gateway = aGatewayServing(aJudgedRouterOver(), {
      classifyBranch: judge.classifyBranch,
      resumesServerState: true,
      pinnedBranchAt: () => 'talker',
    });

    const walk = await gateway.send();

    expect(judge.asked).toEqual([]);
    expect(walk.attempted).toEqual(['talker']);
  });

  test('a conversation nobody pinned is refused with no call, never sent down else', async () => {
    const judge = aJudgeAnswering({ heard: 'answer', label: 'code' });
    const gateway = aGatewayServing(aJudgedRouterOver(), {
      classifyBranch: judge.classifyBranch,
      resumesServerState: true,
    });

    const walk = await gateway.send();

    expect(judge.asked).toEqual([]);
    expect(walk.attempted).toEqual([]);
  });

  test('re-judging every request still cannot move a sealed conversation off its pin', async () => {
    const judge = aJudgeAnswering({ heard: 'answer', label: 'code' });
    const gateway = aGatewayServing(aJudgedRouterOver({ rejudgeEveryRequest: true }), {
      classifyBranch: judge.classifyBranch,
      resumesServerState: true,
      pinnedBranchAt: () => 'talker',
    });

    const walk = await gateway.send();

    expect(judge.asked).toEqual([]);
    expect(walk.attempted).toEqual(['talker']);
  });

  test('a conditional router refuses that turn for the judge it could not ask, not for spreading', async () => {
    const gateway = aGatewayServing(aJudgedRouterOver(), { resumesServerState: true });

    const walk = await gateway.send();

    expect(walk.verdict).toMatchObject({ outcome: 'unjudged', routeNode: 'ladder' });
  });
});

describe('the branch a fresh turn inherits from the conversation before it', () => {
  test('a pinned conversation reaches its earned branch with no call', async () => {
    const judge = aJudgeAnswering({ heard: 'answer', label: 'code' });
    const gateway = aGatewayServing(aJudgedRouterOver(), {
      classifyBranch: judge.classifyBranch,
      pinnedBranchAt: () => 'talker',
    });

    const walk = await gateway.send();

    expect(judge.asked).toEqual([]);
    expect(walk.attempted).toEqual(['talker']);
  });

  test('a router set to re-judge every request ignores the pin and asks again', async () => {
    const judge = aJudgeAnswering({ heard: 'answer', label: 'code' });
    const gateway = aGatewayServing(aJudgedRouterOver({ rejudgeEveryRequest: true }), {
      classifyBranch: judge.classifyBranch,
      pinnedBranchAt: () => 'talker',
    });

    const walk = await gateway.send();

    expect(judge.asked).toEqual([JUDGE]);
    expect(walk.attempted).toEqual(['coder']);
  });

  test('the pin is looked up under the router that would have spent the judge call', async () => {
    const lookedUp: string[] = [];
    const gateway = aGatewayServing(aJudgedRouterOver(), {
      pinnedBranchAt: (routeNode) => {
        lookedUp.push(routeNode);

        return undefined;
      },
    });

    await gateway.send();

    expect(lookedUp).toEqual(['ladder']);
  });
});
