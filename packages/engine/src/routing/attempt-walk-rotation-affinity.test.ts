import { describe, expect, test } from 'vitest';

import { aGatewayServing, aLadderOver, aRotationOver } from './attempt-walk.testkit';

const SEALED = { resumesServerState: true };

describe('the child a spreading router keeps for a conversation that resumes server-side state', () => {
  test('a sealed turn lands on the child the opening turn took', async () => {
    const gateway = aGatewayServing(aRotationOver('one', 'two'));

    const opening = await gateway.send();
    const resumed = await gateway.send({}, SEALED);

    expect(opening.attempted).toEqual(['one']);
    expect(resumed.attempted).toEqual(['one']);
  });

  test('a sealed turn holds its child while the rotation keeps spreading beside it', async () => {
    const gateway = aGatewayServing(aRotationOver('one', 'two'));

    await gateway.send();
    const spread = await gateway.send({}, { conversation: 'another' });
    const resumed = await gateway.send({}, SEALED);

    expect(spread.attempted).toEqual(['two']);
    expect(resumed.attempted).toEqual(['one']);
  });
});

describe('what a spreading router does with a sealed turn it kept no child for', () => {
  test('a conversation nobody kept a child for refuses rather than spreading', async () => {
    const gateway = aGatewayServing(aRotationOver('one', 'two'));

    const walk = await gateway.send({}, SEALED);

    expect(walk.attempted).toEqual([]);
    expect(walk.verdict).toMatchObject({ outcome: 'chained-turn', routeNode: 'ladder' });
  });

  test('a sealed turn whose kept child stood down refuses rather than moving to its sibling', async () => {
    const gateway = aGatewayServing(aRotationOver('one', 'two'));

    await gateway.send();
    gateway.standDown('one', 60_000);
    const walk = await gateway.send({}, SEALED);

    expect(walk.attempted).toEqual([]);
    expect(walk.verdict).toMatchObject({ outcome: 'chained-turn', routeNode: 'ladder' });
  });

  test('the child is kept under the router that spread the request', async () => {
    const kept: string[] = [];
    const gateway = aGatewayServing(aRotationOver('one', 'two'), {
      pinChildAt: (routeNode, child) => {
        kept.push(`${routeNode}:${child}`);
      },
    });

    await gateway.send();

    expect(kept).toEqual(['ladder:one']);
  });

  test('a failover ladder keeps no child, because it never spread the request', async () => {
    const kept: string[] = [];
    const gateway = aGatewayServing(aLadderOver('one', 'two'), {
      pinChildAt: (routeNode, child) => {
        kept.push(`${routeNode}:${child}`);
      },
    });

    await gateway.send();

    expect(kept).toEqual([]);
  });
});
