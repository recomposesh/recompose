import type { EngineRouteNode } from '@recompose/contracts';

import { describe, expect, test } from 'vitest';

import { ATTEMPT_LIMIT } from './attempt-walk';
import {
  NOW,
  aGatewayServing,
  aJudgeAnswering,
  aJudgedRouterOver,
  aRotationBesideAJudgedRouter,
  refusedBy,
} from './attempt-walk.testkit';
import { aBoundTarget, aFailoverOver, aRateLimit, aTableEnteredAt } from './routing.testkit';

const A_LONG_STAND_DOWN = 600_000;

function aRotationOverAJudgedRouterComingUpEmpty() {
  const judge = aJudgeAnswering({ heard: 'answer', label: 'code' });
  const gateway = aGatewayServing(aRotationBesideAJudgedRouter('alpha', 'beta'), {
    classifyBranch: judge.classifyBranch,
  });

  gateway.standDown('coder', A_LONG_STAND_DOWN);
  gateway.standDown('catchall', A_LONG_STAND_DOWN);

  return { judge, gateway };
}

async function childrenServing(
  gateway: ReturnType<typeof aGatewayServing>,
  requests: number,
): Promise<readonly string[]> {
  const served: string[] = [];

  for (let request = 0; request < requests; request += 1) {
    const walk = await gateway.send();

    served.push(...walk.attempted);
  }

  return served;
}

function countsOf(served: readonly string[], children: readonly string[]): readonly number[] {
  return children.map((child) => served.filter((each) => each === child).length);
}

describe('the turn a rotation spends on a router that handed the request nowhere', () => {
  test('a router that offered nothing spends no turn, so the next child still stands next', async () => {
    const { gateway } = aRotationOverAJudgedRouterComingUpEmpty();

    await gateway.send();

    expect(gateway.turnAt('top')).toBe(1);
  });

  test('four requests spread evenly across the two children that could take one', async () => {
    const { gateway } = aRotationOverAJudgedRouterComingUpEmpty();

    const served = await childrenServing(gateway, 4);

    expect(countsOf(served, ['alpha', 'beta'])).toEqual([2, 2]);
  });

  test('a rotation whose own child answered spends exactly the one turn it handed on', async () => {
    const judge = aJudgeAnswering({ heard: 'answer', label: 'code' });
    const gateway = aGatewayServing(aRotationBesideAJudgedRouter('alpha', 'beta'), {
      classifyBranch: judge.classifyBranch,
    });

    await gateway.send();

    expect(gateway.turnAt('top')).toBe(1);
  });
});

function aJudgedRouterWhoseBranchAndElseBothRefuse() {
  const judge = aJudgeAnswering({ heard: 'answer', label: 'code' });
  const gateway = aGatewayServing(aJudgedRouterOver(), { classifyBranch: judge.classifyBranch });

  return {
    judge,
    send: async () =>
      gateway.send({ coder: aRateLimit(NOW + 30_000), catchall: aRateLimit(NOW + 20_000) }),
  };
}

describe('the account a walk gives for a healthy child its branch decision could not reach', () => {
  test('the child standing off the decided branch is named beside the two that refused', async () => {
    const walk = await aJudgedRouterWhoseBranchAndElseBothRefuse().send();

    expect(walk.notes).toStrictEqual([
      { routeNode: 'coder', reason: { because: 'refused', status: 429 }, retryAtMs: NOW + 30_000 },
      { routeNode: 'talker', reason: { because: 'off-branch' } },
      {
        routeNode: 'catchall',
        reason: { because: 'refused', status: 429 },
        retryAtMs: NOW + 20_000,
      },
    ]);
  });

  test('the refusal promises no retry time while that child stands ready to serve', async () => {
    const walk = await aJudgedRouterWhoseBranchAndElseBothRefuse().send();

    expect(walk.verdict).toStrictEqual({ outcome: 'exhausted' });
  });

  test('a child the decided branch did reach earns no such note when one of them answered', async () => {
    const judge = aJudgeAnswering({ heard: 'answer', label: 'code' });
    const gateway = aGatewayServing(aJudgedRouterOver(), { classifyBranch: judge.classifyBranch });

    const walk = await gateway.send();

    expect(walk.verdict.outcome).toBe('answered');
    expect(walk.notes).toEqual([]);
  });

  test('a walk that reached every child still promises the retry time they all named', async () => {
    const judge = aJudgeAnswering({ heard: 'answer', label: 'code' });
    const gateway = aGatewayServing(aJudgedRouterOver({ branches: { code: 'coder' } }), {
      classifyBranch: judge.classifyBranch,
    });

    const walk = await gateway.send({
      coder: aRateLimit(NOW + 30_000),
      catchall: aRateLimit(NOW + 20_000),
    });

    expect(walk.verdict).toStrictEqual({ outcome: 'exhausted', retryAtMs: NOW + 20_000 });
  });
});

const CROWD = Array.from({ length: 12 }, (_, at) => `crowd-${String(at)}`);

/**
 * A judged router whose decided branch holds more children than one request may ever attempt.
 *
 * @summary The cap stops the walk with healthy children still standing under the branch it took,
 * which is the one shape that tells a child the walk never got to apart from a child the decision
 * walked past.
 */
function aJudgedBranchOverACrowdedLadder() {
  const nodes: Record<string, EngineRouteNode> = {
    ladder: {
      kind: 'router',
      policy: {
        mode: 'conditional',
        judge: 'judge',
        branches: [{ label: 'code', rule: 'asks about code', child: 'crowded' }],
        elseChild: 'catchall',
        judgeBoundMs: 2_000,
        rejudgeEveryRequest: false,
      },
      children: ['crowded', 'talker', 'catchall'],
    },
    crowded: aFailoverOver(...CROWD),
    judge: aBoundTarget(),
    talker: aBoundTarget(),
    catchall: aBoundTarget(),
  };

  for (const child of CROWD) nodes[child] = aBoundTarget();

  return aGatewayServing(aTableEnteredAt('ladder', nodes), {
    classifyBranch: aJudgeAnswering({ heard: 'answer', label: 'code' }).classifyBranch,
  });
}

describe('the children a walk that stopped at the attempt cap accounts for', () => {
  test('the crowd it tried is named and the rest of that branch is left alone', async () => {
    const walk = await aJudgedBranchOverACrowdedLadder().send(refusedBy(CROWD, () => aRateLimit()));

    expect(walk.attempted).toHaveLength(ATTEMPT_LIMIT);
    expect(walk.notes.map((note) => note.routeNode)).toEqual([
      ...CROWD.slice(0, ATTEMPT_LIMIT),
      'talker',
    ]);
  });

  test('the child the decision walked past is still named, cap or no cap', async () => {
    const walk = await aJudgedBranchOverACrowdedLadder().send(refusedBy(CROWD, () => aRateLimit()));

    expect(walk.notes.at(-1)).toEqual({ routeNode: 'talker', reason: { because: 'off-branch' } });
  });
});
