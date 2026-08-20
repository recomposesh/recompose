import type { GatewayBranchPins } from '@recompose/contracts';

import { describe, expect, test } from 'vitest';

import { branchPinsAt } from './branch-pins';

const AT = { slug: 'personal', virtualModel: 'fast', routeNode: 'ladder' };

const holding: GatewayBranchPins = {
  personal: {
    fast: { ladder: { coder: 2, talker: 1 }, deeper: { writer: 5 } },
    slow: { ladder: { coder: 9 } },
  },
  work: { fast: { ladder: { coder: 7 } } },
};

describe('how many conversations a branch of one router is holding', () => {
  test('a branch answers the count the engine last said it held', () => {
    expect(branchPinsAt(holding, AT).get('coder')).toBe(2);
  });

  test('every branch of the router reads, and no branch of the one beside it', () => {
    expect([...branchPinsAt(holding, AT)]).toEqual([
      ['coder', 2],
      ['talker', 1],
    ]);
  });

  test('two virtual models over one gateway never add into each other', () => {
    expect(branchPinsAt(holding, { ...AT, virtualModel: 'slow' }).get('coder')).toBe(9);
  });

  test('two gateways never add into each other', () => {
    expect(branchPinsAt(holding, { ...AT, slug: 'work' }).get('coder')).toBe(7);
  });

  test('a router nothing has judged through yet holds nothing', () => {
    expect([...branchPinsAt(holding, { ...AT, routeNode: 'unjudged' })]).toEqual([]);
  });

  test('a gateway that never served holds nothing rather than breaking the rows', () => {
    expect([...branchPinsAt({}, AT)]).toEqual([]);
  });

  test('a branch that let its last conversation go stops answering a count', () => {
    expect(branchPinsAt(holding, AT).get('writer')).toBeUndefined();
  });

  test('a place named after the prototype chain holds nothing rather than a phantom', () => {
    expect([
      ...branchPinsAt({}, { slug: 'constructor', virtualModel: 'name', routeNode: '0' }),
    ]).toEqual([]);
  });
});
