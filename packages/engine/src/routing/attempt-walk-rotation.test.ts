import { describe, expect, test } from 'vitest';

import { aGatewayServing, aRotationOver } from './attempt-walk.testkit';
import { aRateLimit } from './routing.testkit';

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
