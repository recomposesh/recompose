import type { EngineRouting } from '@recompose/contracts';

import { describe, expect, test } from 'vitest';

import { JUDGE, aGatewayServing, aJudgeAnswering, aJudgedRouterOver } from './attempt-walk.testkit';
import { aBoundTarget, aFailoverOver, aRateLimit, aTableEnteredAt } from './routing.testkit';

function aLadderAboveAJudgedRouter(): EngineRouting {
  return aTableEnteredAt('top', {
    ...aJudgedRouterOver().nodes,
    top: aFailoverOver('ladder', 'spare'),
    spare: aBoundTarget(),
  });
}

function aJudgeNamingCode() {
  const judge = aJudgeAnswering({ heard: 'answer', label: 'code' });
  const gateway = aGatewayServing(aLadderAboveAJudgedRouter(), {
    classifyBranch: judge.classifyBranch,
  });

  return { judge, gateway };
}

describe('the sibling standing beside a judged router that offered nothing', () => {
  test('a judged router whose branch and else both stand cooling hands the turn on', async () => {
    const { gateway } = aJudgeNamingCode();

    gateway.standDown('coder', 60_000);
    gateway.standDown('catchall', 60_000);
    const walk = await gateway.send();

    expect(walk.verdict).toEqual({ outcome: 'answered', routeNode: 'spare', answer: 'spare' });
  });

  test('a branch and an else that refuse in flight still leave the sibling its turn', async () => {
    const { gateway } = aJudgeNamingCode();

    const walk = await gateway.send({ coder: aRateLimit(), catchall: aRateLimit() });

    expect(walk.attempted).toEqual(['coder', 'catchall', 'spare']);
    expect(walk.verdict.outcome).toBe('answered');
  });

  test('backtracking past a judged router spends no second call on its judge', async () => {
    const { gateway, judge } = aJudgeNamingCode();

    gateway.standDown('coder', 60_000);
    gateway.standDown('catchall', 60_000);
    await gateway.send();

    expect(judge.asked).toEqual([JUDGE]);
  });

  test('a walk exhausts only once the sibling has stood down too', async () => {
    const { gateway } = aJudgeNamingCode();

    gateway.standDown('coder', 60_000);
    gateway.standDown('catchall', 60_000);
    gateway.standDown('spare', 60_000);
    const walk = await gateway.send();

    expect(walk.verdict.outcome).toBe('exhausted');
  });

  test('a judged router that still reaches its else keeps the turn from its sibling', async () => {
    const { gateway } = aJudgeNamingCode();

    gateway.standDown('coder', 60_000);
    const walk = await gateway.send();

    expect(walk.attempted).toEqual(['catchall']);
  });
});
