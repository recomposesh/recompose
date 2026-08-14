import { describe, expect, test } from 'vitest';

import { engineSpendRequestSchema, engineTrafficReportSchema } from './engine-protocol';
import { gatewayTrafficSchema } from './engine-traffic';

const firstChild = 'first';

const secondChild = 'second';

const spendRequest = {
  kind: 'spend-request',
  id: 'g1',
  slug: 'personal',
  virtualModel: 'fast',
  routeNode: firstChild,
};

const servedAt = 1_754_600_000_000;

const served = { outcome: 'served', at: servedAt };

const failed = {
  outcome: 'failed',
  at: servedAt,
  status: 429,
  detail: 'The target is turning requests away for now.',
};

const report = {
  kind: 'traffic',
  slug: 'personal',
  virtualModel: 'fast',
  routeNode: firstChild,
  request: served,
};

describe('the seat a spend request asks custody for', () => {
  test('a request names the node it is about to try, beside the gateway and the model', () => {
    expect(engineSpendRequestSchema.parse(spendRequest)).toEqual(spendRequest);
  });

  test('a request naming no node is refused, because main resolves custody per node', () => {
    const { routeNode, ...withoutTheNode } = spendRequest;

    expect(routeNode).toBe(firstChild);
    expect(() => engineSpendRequestSchema.parse(withoutTheNode)).toThrow();
  });

  test('a request naming a blank node is refused, because no seat carries that name', () => {
    expect(() => engineSpendRequestSchema.parse({ ...spendRequest, routeNode: '   ' })).toThrow();
  });

  test('two attempts through one virtual model ask under their own seats', () => {
    const second = { ...spendRequest, id: 'g2', routeNode: secondChild };

    expect(engineSpendRequestSchema.parse(second).routeNode).toBe(secondChild);
    expect(engineSpendRequestSchema.parse(spendRequest).routeNode).toBe(firstChild);
  });
});

describe('the seat a finished attempt is reported against', () => {
  test('a report names the node the attempt went through', () => {
    expect(engineTrafficReportSchema.parse(report)).toEqual(report);
  });

  test('a report naming no node is refused, because no cable would own the outcome', () => {
    const { routeNode, ...withoutTheNode } = report;

    expect(routeNode).toBe(firstChild);
    expect(() => engineTrafficReportSchema.parse(withoutTheNode)).toThrow();
  });

  test('a report naming a blank node is refused', () => {
    expect(() => engineTrafficReportSchema.parse({ ...report, routeNode: '   ' })).toThrow();
  });
});

describe('the traffic snapshot keyed three levels deep', () => {
  test('a snapshot reads gateway, then virtual model, then route node, to one outcome', () => {
    const snapshot = { personal: { fast: { [firstChild]: served } } };

    expect(gatewayTrafficSchema.parse(snapshot)).toEqual(snapshot);
  });

  test('one request that tried two children keeps an outcome under each', () => {
    const snapshot = { personal: { fast: { [firstChild]: failed, [secondChild]: served } } };

    expect(gatewayTrafficSchema.parse(snapshot)).toEqual(snapshot);
  });

  test('an attempt still in flight sits under its own node, so a live cable has an owner', () => {
    const snapshot = { personal: { fast: { [firstChild]: { outcome: 'live', at: servedAt } } } };

    expect(gatewayTrafficSchema.parse(snapshot)).toEqual(snapshot);
  });

  test('a virtual model nothing has flowed through yet holds an empty set of nodes', () => {
    expect(gatewayTrafficSchema.parse({ personal: { fast: {} } })).toEqual({
      personal: { fast: {} },
    });
  });

  test('an outcome sitting where a node table belongs is refused', () => {
    expect(() => gatewayTrafficSchema.parse({ personal: { fast: served } })).toThrow();
  });

  test('a snapshot keyed by a blank route node is refused', () => {
    expect(() => gatewayTrafficSchema.parse({ personal: { fast: { '   ': served } } })).toThrow();
  });
});
