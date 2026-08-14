import { describe, expect, test } from 'vitest';

import {
  NOW,
  aGatewayServing,
  aLadderOver,
  aRotationOver,
  refusedBy,
} from './attempt-walk.testkit';
import {
  aBoundTarget,
  aDroppedConnection,
  aFailoverOver,
  aRateLimit,
  aRoundRobinOver,
  aTableEnteredAt,
} from './routing.testkit';

describe('the refusal a router holding no child earns', () => {
  test('a router holding no child refuses before any request leaves the machine', async () => {
    const gateway = aGatewayServing(aTableEnteredAt('empty', { empty: aRoundRobinOver() }));

    const walk = await gateway.send();

    expect(walk.verdict).toEqual({
      outcome: 'empty-router',
      routeNode: 'empty',
      router: { kind: 'router', policy: { mode: 'round-robin' }, children: [] },
    });
    expect(walk.attempted).toEqual([]);
  });

  test('a childless router nested under a ladder is the one the refusal names', async () => {
    const gateway = aGatewayServing(
      aTableEnteredAt('top', { top: aFailoverOver('inner'), inner: aFailoverOver() }),
    );

    const walk = await gateway.send();

    expect(walk.verdict).toMatchObject({ outcome: 'empty-router', routeNode: 'inner' });
  });

  test('a ladder holding a target beside a childless router reports exhaustion instead', async () => {
    const gateway = aGatewayServing(
      aTableEnteredAt('top', {
        top: aFailoverOver('only', 'empty'),
        only: aBoundTarget(),
        empty: aFailoverOver(),
      }),
    );

    const walk = await gateway.send({ only: aRateLimit() });

    expect(walk.verdict).toStrictEqual({ outcome: 'exhausted' });
  });
});

describe('the retry time an exhausted router reports', () => {
  test('every child promising a time reports the earliest of them', async () => {
    const gateway = aGatewayServing(aRotationOver('left', 'right'));

    const walk = await gateway.send({
      left: aRateLimit(NOW + 30_000),
      right: aRateLimit(NOW + 10_000),
    });

    expect(walk.verdict).toEqual({ outcome: 'exhausted', retryAtMs: NOW + 10_000 });
  });

  test('a pool downed with no provider naming a time carries no retry time', async () => {
    const gateway = aGatewayServing(aLadderOver('first', 'second'));

    const walk = await gateway.send(refusedBy(['first', 'second'], () => aDroppedConnection()));

    expect(walk.verdict).toStrictEqual({ outcome: 'exhausted' });
  });

  test('a pool where one child was merely guessed at carries no retry time', async () => {
    const gateway = aGatewayServing(aLadderOver('first', 'second'));

    const walk = await gateway.send({
      first: aRateLimit(NOW + 10_000),
      second: aDroppedConnection(),
    });

    expect(walk.verdict).toStrictEqual({ outcome: 'exhausted' });
  });

  test('a walk that could attempt nothing at all carries no retry time', async () => {
    const gateway = aGatewayServing(aTableEnteredAt('missing', { other: aBoundTarget() }));

    const walk = await gateway.send();

    expect(walk.verdict).toStrictEqual({ outcome: 'exhausted' });
    expect(walk.notes).toEqual([]);
  });
});
