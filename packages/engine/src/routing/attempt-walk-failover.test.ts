import { describe, expect, test } from 'vitest';

import { aGatewayServing, aLadderOver, refusedBy } from './attempt-walk.testkit';
import {
  aBoundTarget,
  aDroppedConnection,
  aFailoverOver,
  aGrantWithoutCredential,
  aMalformedRequest,
  aRateLimit,
  aStreamOpeningWithAnError,
  aTableEnteredAt,
} from './routing.testkit';

describe('the child a failover ladder serves the request through', () => {
  test('a rate-limited first child hands the request to the next', async () => {
    const gateway = aGatewayServing(aLadderOver('first', 'second'));

    const walk = await gateway.send({ first: aRateLimit() });

    expect(walk.verdict).toEqual({ outcome: 'answered', routeNode: 'second', answer: 'second' });
    expect(walk.attempted).toEqual(['first', 'second']);
  });

  test('a malformed request stops at the first child and the second receives nothing', async () => {
    const gateway = aGatewayServing(aLadderOver('first', 'second'));

    const walk = await gateway.send({ first: aMalformedRequest() });

    expect(walk.verdict).toEqual({ outcome: 'answered', routeNode: 'first', answer: 'malformed' });
    expect(walk.attempted).toEqual(['first']);
  });

  test('a walk that runs out of children attempts each of them exactly once', async () => {
    const gateway = aGatewayServing(aLadderOver('first', 'second'));

    const walk = await gateway.send(refusedBy(['first', 'second'], () => aRateLimit()));

    expect(walk.verdict.outcome).toBe('exhausted');
    expect(walk.attempted).toEqual(['first', 'second']);
  });

  test('a ladder standing over another ladder reaches the deepest child declared first', async () => {
    const gateway = aGatewayServing(
      aTableEnteredAt('top', {
        top: aFailoverOver('inner', 'late'),
        inner: aFailoverOver('deep'),
        deep: aBoundTarget(),
        late: aBoundTarget(),
      }),
    );

    const walk = await gateway.send({ deep: aRateLimit() });

    expect(walk.attempted).toEqual(['deep', 'late']);
  });
});

describe('the failures a ladder moves past without ending the request', () => {
  test('a credential the grant could not resolve cools that child alone', async () => {
    const gateway = aGatewayServing(aLadderOver('first', 'second'));

    const walk = await gateway.send({ first: aGrantWithoutCredential() });

    expect(walk.verdict).toEqual({ outcome: 'answered', routeNode: 'second', answer: 'second' });
    expect(gateway.cooling('first')).toBeDefined();
    expect(gateway.cooling('second')).toBeUndefined();
  });

  test('a connection that drops carrying no status hands the request to the next child', async () => {
    const gateway = aGatewayServing(aLadderOver('first', 'second'));

    const walk = await gateway.send({ first: aDroppedConnection() });

    expect(walk.verdict).toEqual({ outcome: 'answered', routeNode: 'second', answer: 'second' });
  });

  test('a stream opening with a retryable error hands the request to the next child', async () => {
    const gateway = aGatewayServing(aLadderOver('first', 'second'));

    const walk = await gateway.send({ first: aStreamOpeningWithAnError() });

    expect(walk.verdict).toEqual({ outcome: 'answered', routeNode: 'second', answer: 'second' });
  });

  test('a child naming no node in the table is passed over for the next one declared', async () => {
    const gateway = aGatewayServing(
      aTableEnteredAt('ladder', {
        ladder: aFailoverOver('ghost', 'real'),
        real: aBoundTarget(),
      }),
    );

    const walk = await gateway.send();

    expect(walk.verdict).toEqual({ outcome: 'answered', routeNode: 'real', answer: 'real' });
    expect(walk.attempted).toEqual(['real']);
  });
});
