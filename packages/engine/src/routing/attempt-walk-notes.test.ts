import { describe, expect, test } from 'vitest';

import {
  NOW,
  aGatewayServing,
  aLadderOver,
  aRotationOver,
  refusedBy,
} from './attempt-walk.testkit';
import { aRateLimit } from './routing.testkit';

describe('what a walk records about the children it could not use', () => {
  test('a child refused before the answer is named with the reason it gave', async () => {
    const gateway = aGatewayServing(aLadderOver('first', 'second'));

    const walk = await gateway.send({ first: aRateLimit() });

    expect(walk.verdict.outcome).toBe('answered');
    expect(walk.notes).toStrictEqual([
      { routeNode: 'first', reason: { because: 'refused', status: 429 } },
    ]);
  });

  test('a child that answered the request earns no note of its own', async () => {
    const gateway = aGatewayServing(aLadderOver('first', 'second'));

    const walk = await gateway.send({ first: aRateLimit() });

    expect(walk.notes.map((note) => note.routeNode)).toEqual(['first']);
  });

  test('a child already cooling is named beside the one just refused', async () => {
    const gateway = aGatewayServing(aRotationOver('left', 'right'));

    await gateway.send({ left: aRateLimit(NOW + 30_000) });
    const walk = await gateway.send({ right: aRateLimit(NOW + 20_000) });

    expect(walk.notes).toStrictEqual([
      { routeNode: 'left', reason: { because: 'cooling' }, retryAtMs: NOW + 30_000 },
      { routeNode: 'right', reason: { because: 'refused', status: 429 }, retryAtMs: NOW + 20_000 },
    ]);
  });

  test('the notes read in the order the table declares its children', async () => {
    const gateway = aGatewayServing(aRotationOver('left', 'right', 'far'));

    await gateway.send();
    const walk = await gateway.send(refusedBy(['left', 'right', 'far'], () => aRateLimit()));

    expect(walk.attempted).toEqual(['right', 'left', 'far']);
    expect(walk.notes.map((note) => note.routeNode)).toEqual(['left', 'right', 'far']);
  });
});
