import type { EngineRouteNode } from '@recompose/contracts';

import { describe, expect, test } from 'vitest';

import type { Walking } from './walk-descent';

import { createCooldownLedger } from './cooldown-ledger';
import { createRotationCursors } from './rotation-cursors';
import { aBoundTarget, aFailoverOver, aRoundRobinOver, aTableEnteredAt } from './routing.testkit';
import { stepTheWalkTakesNext } from './walk-descent';
import { noteOf } from './walk-notes';

function aWalkOverExhausted(entry: EngineRouteNode): Walking {
  const attempted = new Map([
    ['target:one', noteOf('target:one', { because: 'refused', status: 429 }, undefined)],
    ['target:two', noteOf('target:two', { because: 'refused', status: 429 }, undefined)],
  ]);

  return {
    routing: aTableEnteredAt('router:entry', {
      'router:entry': entry,
      'target:one': aBoundTarget(),
      'target:two': aBoundTarget(),
    }),
    slug: 'codex',
    virtualModel: 'fast',
    ledger: createCooldownLedger(() => 0),
    cursors: createRotationCursors(),
    rotationPins: { pinnedChildAt: () => undefined, pinChildAt: () => undefined },
    resumesServerState: false,
    attempted,
    judging: {
      classify: undefined,
      judgeStandsCooling: () => false,
      pinnedBranchAt: () => undefined,
      pinBranchAt: () => undefined,
      resumesServerState: false,
      decided: new Map(),
    },
    spent: new Set(),
  };
}

describe('a failover ladder whose children have all stood down', () => {
  test('reports the table exhausted rather than asking to start again', async () => {
    const walking = aWalkOverExhausted(aFailoverOver('target:one', 'target:two'));

    await expect(stepTheWalkTakesNext(walking)).resolves.toEqual({ at: 'nowhere' });
    expect(walking.spent.size).toBe(0);
  });
});

describe('a round-robin router whose children have all stood down', () => {
  test('reports the table exhausted rather than asking to start again', async () => {
    const walking = aWalkOverExhausted(aRoundRobinOver('target:one', 'target:two'));

    await expect(stepTheWalkTakesNext(walking)).resolves.toEqual({ at: 'nowhere' });
    expect(walking.spent.size).toBe(0);
  });
});
