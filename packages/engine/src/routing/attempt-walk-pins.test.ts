import { describe, expect, test } from 'vitest';

import type { Scene } from './attempt-walk.testkit';

import { aGatewayServing, aJudgeAnswering, aJudgedRouterOver } from './attempt-walk.testkit';

type Pinned = { routeNode: string; child: string };

type PinWatch = { pinned: Pinned[]; pinBranchAt: NonNullable<Scene['pinBranchAt']> };

function watchingPins(): PinWatch {
  const pinned: Pinned[] = [];

  return {
    pinned,
    pinBranchAt: (routeNode, child) => {
      pinned.push({ routeNode, child });
    },
  };
}

describe('the branch a walk pins for the conversation to keep', () => {
  test('a judged branch is pinned at the router that judged it', async () => {
    const watching = watchingPins();
    const judge = aJudgeAnswering({ heard: 'answer', label: 'code' });
    const gateway = aGatewayServing(aJudgedRouterOver(), {
      classifyBranch: judge.classifyBranch,
      pinBranchAt: watching.pinBranchAt,
    });

    await gateway.send();

    expect(watching.pinned).toEqual([{ routeNode: 'ladder', child: 'coder' }]);
  });

  test('a branch earned on the second ask is pinned like any other', async () => {
    const watching = watchingPins();
    const judge = aJudgeAnswering(
      { heard: 'answer', label: 'weather' },
      { heard: 'answer', label: 'chat' },
    );
    const gateway = aGatewayServing(aJudgedRouterOver(), {
      classifyBranch: judge.classifyBranch,
      pinBranchAt: watching.pinBranchAt,
    });

    await gateway.send();

    expect(watching.pinned).toEqual([{ routeNode: 'ladder', child: 'talker' }]);
  });

  test('re-judging every request pins the branch the fresh judgment earned', async () => {
    const watching = watchingPins();
    const judge = aJudgeAnswering({ heard: 'answer', label: 'chat' });
    const gateway = aGatewayServing(aJudgedRouterOver({ rejudgeEveryRequest: true }), {
      classifyBranch: judge.classifyBranch,
      pinnedBranchAt: () => 'coder',
      pinBranchAt: watching.pinBranchAt,
    });

    await gateway.send();

    expect(watching.pinned).toEqual([{ routeNode: 'ladder', child: 'talker' }]);
  });
});

describe('the branch a walk refuses to pin', () => {
  test('a request that fell to else on a refusal leaves the conversation unpinned', async () => {
    const watching = watchingPins();
    const judge = aJudgeAnswering({ heard: 'refusal' });
    const gateway = aGatewayServing(aJudgedRouterOver(), {
      classifyBranch: judge.classifyBranch,
      pinBranchAt: watching.pinBranchAt,
    });

    await gateway.send();

    expect(watching.pinned).toEqual([]);
  });

  test('a request that fell to else past the budget leaves the conversation unpinned', async () => {
    const watching = watchingPins();
    const judge = aJudgeAnswering({ heard: 'timeout' });
    const gateway = aGatewayServing(aJudgedRouterOver(), {
      classifyBranch: judge.classifyBranch,
      pinBranchAt: watching.pinBranchAt,
    });

    await gateway.send();

    expect(watching.pinned).toEqual([]);
  });

  test('a request that fell to else on two answers no branch wears leaves it unpinned', async () => {
    const watching = watchingPins();
    const judge = aJudgeAnswering({ heard: 'answer', label: 'weather' });
    const gateway = aGatewayServing(aJudgedRouterOver(), {
      classifyBranch: judge.classifyBranch,
      pinBranchAt: watching.pinBranchAt,
    });

    await gateway.send();

    expect(watching.pinned).toEqual([]);
  });
});

describe('the branch a walk refuses to pin when no judgment happened', () => {
  test('a cooling judge sends the request to else and pins nothing', async () => {
    const watching = watchingPins();
    const judge = aJudgeAnswering({ heard: 'answer', label: 'code' });
    const gateway = aGatewayServing(aJudgedRouterOver(), {
      classifyBranch: judge.classifyBranch,
      pinBranchAt: watching.pinBranchAt,
    });

    gateway.standDown('judge', 30_000);

    await gateway.send();

    expect(watching.pinned).toEqual([]);
  });

  test('a turn following its pin pins nothing, because no judgment happened', async () => {
    const watching = watchingPins();
    const judge = aJudgeAnswering({ heard: 'answer', label: 'code' });
    const gateway = aGatewayServing(aJudgedRouterOver(), {
      classifyBranch: judge.classifyBranch,
      pinnedBranchAt: () => 'talker',
      pinBranchAt: watching.pinBranchAt,
    });

    await gateway.send();

    expect(watching.pinned).toEqual([]);
  });

  test('a declined request leaves no pin, so the next turn is read on its own words', async () => {
    const watching = watchingPins();
    const judge = aJudgeAnswering({ heard: 'answer', label: 'none' });
    const gateway = aGatewayServing(aJudgedRouterOver(), {
      classifyBranch: judge.classifyBranch,
      pinBranchAt: watching.pinBranchAt,
    });

    await gateway.send();

    expect(watching.pinned).toEqual([]);
  });

  test('a sealed turn nobody pinned takes else and stays unpinned', async () => {
    const watching = watchingPins();
    const judge = aJudgeAnswering({ heard: 'answer', label: 'code' });
    const gateway = aGatewayServing(aJudgedRouterOver(), {
      classifyBranch: judge.classifyBranch,
      resumesServerState: true,
      pinBranchAt: watching.pinBranchAt,
    });

    await gateway.send();

    expect(watching.pinned).toEqual([]);
  });
});
