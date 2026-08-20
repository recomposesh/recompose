import { describe, expect, test } from 'vitest';

import { engineSpendRequestSchema } from './engine-protocol';

const spendRequest = {
  kind: 'spend-request',
  id: 'g1',
  slug: 'personal',
  virtualModel: 'fast',
  routeNode: 'only',
};

describe('the ask a serving gateway sends the parent for one spend', () => {
  test('a spend request names the gateway and the virtual model the traffic arrived under', () => {
    expect(engineSpendRequestSchema.parse(spendRequest)).toEqual(spendRequest);
  });

  test('a spend request naming no gateway is refused, because two gateways may share a name', () => {
    const { slug, ...withoutTheGateway } = spendRequest;

    expect(slug).toBe('personal');
    expect(() => engineSpendRequestSchema.parse(withoutTheGateway)).toThrow();
  });

  test('a spend request naming no virtual model is refused, because it asks for nothing', () => {
    const { virtualModel, ...withoutTheModel } = spendRequest;

    expect(virtualModel).toBe('fast');
    expect(() => engineSpendRequestSchema.parse(withoutTheModel)).toThrow();
  });

  test('a spend request nobody can answer is refused, because the grant would reach no request', () => {
    const { id, ...withoutTheIdentifier } = spendRequest;

    expect(id).toBe('g1');
    expect(() => engineSpendRequestSchema.parse(withoutTheIdentifier)).toThrow();
  });

  test('a spend request carries no credential, because the answer is what brings one', () => {
    for (const smuggled of [{ credential: 'sk-ant-api03-9f2c' }, { key: 'sk-ant-api03-9f2c' }]) {
      expect(() => engineSpendRequestSchema.parse({ ...spendRequest, ...smuggled })).toThrow();
    }
  });

  test('a spend request under a dotted virtual model asks for the branch it is about to try', () => {
    const dotted = { ...spendRequest, virtualModel: 'claude-5.6-sol', routeNode: 'coder' };

    expect(engineSpendRequestSchema.parse(dotted)).toEqual(dotted);
  });

  test('a spend request whose virtual name breaks the alias grammar is refused', () => {
    expect(() =>
      engineSpendRequestSchema.parse({ ...spendRequest, virtualModel: 'Fast Model' }),
    ).toThrow();
  });
});
