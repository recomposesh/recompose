import type { EngineRouteNode } from '@recompose/contracts';

import { fc, test as propertyTest } from '@fast-check/vitest';
import { describe, expect, test } from 'vitest';

import { ATTEMPT_LIMIT } from './attempt-walk';
import { aGatewayServing, aLadderOver, refusedBy } from './attempt-walk.testkit';
import { aBoundTarget, aFailoverOver, aRateLimit, aTableEnteredAt } from './routing.testkit';

function aTableOfLadders(routers: number, childrenEach: number) {
  const nodes: Record<string, EngineRouteNode> = {};
  const children: string[] = [];
  const inner = Array.from({ length: routers }, (_, at) => `inner-${String(at)}`);

  for (const [at, router] of inner.entries()) {
    const under = Array.from(
      { length: childrenEach },
      (_, place) => `child-${String(at)}-${String(place)}`,
    );

    nodes[router] = aFailoverOver(...under);

    for (const child of under) {
      nodes[child] = aBoundTarget();
      children.push(child);
    }
  }

  nodes['top'] = aFailoverOver(...inner);

  return { routing: aTableEnteredAt('top', nodes), children };
}

describe('what bounds a walk however its table is shaped', () => {
  test('a ladder of twelve refusing children stops at the recorded attempt cap', async () => {
    const children = Array.from({ length: 12 }, (_, at) => `child-${String(at)}`);
    const gateway = aGatewayServing(aLadderOver(...children));

    const walk = await gateway.send(refusedBy(children, () => aRateLimit()));

    expect(ATTEMPT_LIMIT).toBe(8);
    expect(walk.attempted).toHaveLength(ATTEMPT_LIMIT);
    expect(walk.verdict.outcome).toBe('exhausted');
  });

  test('two ladders over two children each attempt all four exactly once', async () => {
    const table = aTableOfLadders(2, 2);
    const gateway = aGatewayServing(table.routing);

    const walk = await gateway.send(refusedBy(table.children, () => aRateLimit()));

    expect(walk.attempted).toEqual(['child-0-0', 'child-0-1', 'child-1-0', 'child-1-1']);
  });

  test('a table that leads back to a node it already passed still stops', async () => {
    const gateway = aGatewayServing(
      aTableEnteredAt('top', {
        top: aFailoverOver('loop'),
        loop: aFailoverOver('top', 'only'),
        only: aBoundTarget(),
      }),
    );

    const walk = await gateway.send({ only: aRateLimit() });

    expect(walk.attempted).toEqual(['only']);
    expect(walk.verdict.outcome).toBe('exhausted');
  });
});

describe('the law every walk obeys, whatever table it is handed', () => {
  propertyTest.prop([fc.integer({ min: 1, max: 4 }), fc.integer({ min: 1, max: 4 })])(
    'a walk attempts each child it reaches at most once and never past the cap',
    async (routers, childrenEach) => {
      const table = aTableOfLadders(routers, childrenEach);
      const gateway = aGatewayServing(table.routing);

      const walk = await gateway.send(refusedBy(table.children, () => aRateLimit()));

      expect(new Set(walk.attempted).size).toBe(walk.attempted.length);
      expect(walk.attempted).toHaveLength(Math.min(table.children.length, ATTEMPT_LIMIT));
    },
  );
});
