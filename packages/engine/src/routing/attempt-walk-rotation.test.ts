import { describe, expect, test } from 'vitest';

import type { HeldJudge } from './attempt-walk.testkit';

import {
  aGatewayServing,
  aJudgeHeldOpen,
  aRotationBesideAJudgedRouter,
  aRotationOver,
} from './attempt-walk.testkit';
import { aRateLimit } from './routing.testkit';

const A_LONG_STAND_DOWN = 600_000;

describe('the children a round-robin router spreads its requests over', () => {
  test('two requests reach two different children', async () => {
    const gateway = aGatewayServing(aRotationOver('left', 'right'));

    const first = await gateway.send();
    const second = await gateway.send();

    expect([first.attempted, second.attempted]).toEqual([['left'], ['right']]);
  });

  test('a child standing cooling from an earlier refusal never takes its turn', async () => {
    const gateway = aGatewayServing(aRotationOver('left', 'right'));

    await gateway.send({ left: aRateLimit() });
    const next = await gateway.send();

    expect(next.verdict).toEqual({ outcome: 'answered', routeNode: 'right', answer: 'right' });
    expect(next.attempted).toEqual(['right']);
  });

  test('a child whose cooling ran out takes its turn again', async () => {
    const gateway = aGatewayServing(aRotationOver('left', 'right'));

    await gateway.send({ left: aRateLimit() });
    gateway.tick(60_000);
    const next = await gateway.send();

    expect(next.attempted).toEqual(['left']);
  });
});

async function bothWalksOf(gateway: ReturnType<typeof aGatewayServing>, judge: HeldJudge) {
  const walks = [gateway.send(), gateway.send()];

  await judge.asked;
  judge.release();

  return Promise.all(walks);
}

describe('the children a rotation spreads over while one walk waits on a judge', () => {
  test('the walk arriving second takes the next child rather than the one already picked', async () => {
    const judge = aJudgeHeldOpen({ heard: 'answer', label: 'code' });
    const gateway = aGatewayServing(aRotationBesideAJudgedRouter('alpha'), {
      classifyBranch: judge.classifyBranch,
    });

    const walks = await bothWalksOf(gateway, judge);

    expect(walks.flatMap((walk) => walk.attempted)).toEqual(['coder', 'alpha']);
  });

  test('a walk that came up empty leaves the turn the walk beside it took standing', async () => {
    const judge = aJudgeHeldOpen({ heard: 'answer', label: 'code' });
    const gateway = aGatewayServing(aRotationBesideAJudgedRouter('alpha', 'beta'), {
      classifyBranch: judge.classifyBranch,
    });

    gateway.standDown('coder', A_LONG_STAND_DOWN);
    gateway.standDown('catchall', A_LONG_STAND_DOWN);
    await bothWalksOf(gateway, judge);
    const next = await gateway.send();

    expect(next.attempted).toEqual(['beta']);
  });
});
