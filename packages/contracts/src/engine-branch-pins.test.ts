import { describe, expect, test } from 'vitest';

import { branchPinTallySchema, gatewayBranchPinsSchema } from './engine-branch-pins';

const tally = { coder: 3, talker: 1 };

describe('how many conversations each branch of one router holds', () => {
  test('a branch counts the conversations pinned to it', () => {
    expect(branchPinTallySchema.parse(tally)).toEqual(tally);
  });

  test('a router holding nothing counts nothing', () => {
    expect(branchPinTallySchema.parse({})).toEqual({});
  });

  test('a branch counted below zero is refused', () => {
    expect(() => branchPinTallySchema.parse({ coder: -1 })).toThrow();
  });

  test('a branch counted at zero is refused, because a branch holding nothing takes no count', () => {
    expect(() => branchPinTallySchema.parse({ coder: 0 })).toThrow();
  });

  test('a branch counted by halves is refused, because a conversation is whole or absent', () => {
    expect(() => branchPinTallySchema.parse({ coder: 1.5 })).toThrow();
  });

  test('a tally naming the conversation behind a count is refused, so no fingerprint crosses', () => {
    expect(() =>
      branchPinTallySchema.parse({ coder: { count: 3, conversation: 'abc' } }),
    ).toThrow();
  });
});

describe('the branches every router of every gateway holds', () => {
  const snapshot = { personal: { fast: { ladder: tally } } };

  test('a tally files under the gateway, the virtual model, and the router carrying it', () => {
    expect(gatewayBranchPinsSchema.parse(snapshot)).toEqual(snapshot);
  });

  test('a gateway nothing has pinned through reads as nothing rather than as missing', () => {
    expect(gatewayBranchPinsSchema.parse({})).toEqual({});
  });

  test('a snapshot keyed by something no gateway could be named is refused', () => {
    expect(() => gatewayBranchPinsSchema.parse({ UPPER: { fast: { ladder: tally } } })).toThrow();
  });

  test('a snapshot naming no router between the model and its counts is refused', () => {
    expect(() => gatewayBranchPinsSchema.parse({ personal: { fast: tally } })).toThrow();
  });
});
