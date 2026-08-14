import type { Account, VirtualModel } from '@recompose/contracts';

import { expect, test } from 'vitest';

import { servedModels, servesTally } from './served-models';

const workKey: Account = {
  id: 'k1',
  provider: 'anthropic',
  kind: 'api-key',
  label: 'work',
  credentialRef: 'c1',
};

const fast: VirtualModel = {
  id: 'fast',
  displayName: 'Fast',
  routing: {
    entry: 'seat',
    nodes: { seat: { kind: 'target', accountId: 'k1', providerModel: 'claude-haiku-4-5' } },
  },
};

test('a definition whose target account still stands reads as serving it', () => {
  const [served] = servedModels([fast], [workKey]);

  expect(served).toEqual({
    id: 'fast',
    displayName: 'Fast',
    providerModel: 'claude-haiku-4-5',
    target: { standing: 'serving', account: workKey },
  });
});

test('a definition whose target account left the registry reads as removed', () => {
  const [served] = servedModels([fast], []);

  expect(served?.target).toEqual({ standing: 'removed' });
});

test('a definition still names the model it was bound to after its account left', () => {
  const [served] = servedModels([fast], []);

  expect(served?.providerModel).toBe('claude-haiku-4-5');
});

const routed: VirtualModel = {
  id: 'spread',
  displayName: 'Spread',
  routing: {
    entry: 'ladder',
    nodes: {
      ladder: { kind: 'router', policy: { mode: 'failover' }, children: ['lead', 'spare'] },
      lead: { kind: 'target', accountId: 'k1', providerModel: 'claude-haiku-4-5' },
      spare: { kind: 'target', accountId: 'k2', providerModel: 'claude-opus-5' },
    },
  },
};

test('a routed definition reads the real model the target its ladder tries first serves', () => {
  const [served] = servedModels([routed], [workKey]);

  expect(served?.providerModel).toBe('claude-haiku-4-5');
});

test('a routed definition whose lead account still stands reads as serving through it', () => {
  const [served] = servedModels([routed], [workKey]);

  expect(served?.target).toEqual({ standing: 'serving', account: workKey });
});

test('a routed definition whose lead account left the registry reads as removed', () => {
  const [served] = servedModels([routed], []);

  expect(served?.target).toEqual({ standing: 'removed' });
});

test('a definition routed through a router holding no target names no real model at all', () => {
  const empty: VirtualModel = {
    ...routed,
    routing: {
      entry: 'ladder',
      nodes: { ladder: { kind: 'router', policy: { mode: 'round-robin' }, children: [] } },
    },
  };
  const [served] = servedModels([empty], [workKey]);

  expect(served).toMatchObject({ providerModel: '', target: { standing: 'removed' } });
});

test('the definitions read in the order the gateway stores them', () => {
  const creative: VirtualModel = { ...fast, id: 'creative', displayName: 'Creative' };

  expect(servedModels([fast, creative], [workKey]).map((served) => served.id)).toEqual([
    'fast',
    'creative',
  ]);
});

test('a gateway holding no definition serves nothing at all', () => {
  expect(servedModels([], [workKey])).toEqual([]);
});

test('a gateway serving nothing says so rather than counting to zero', () => {
  expect(servesTally(0)).toBe('no virtual models yet');
});

test('one definition counts in the singular, because a tally a person reads is prose', () => {
  expect(servesTally(1)).toBe('1 virtual model');
});

test('several definitions count in the plural', () => {
  expect(servesTally(2)).toBe('2 virtual models');
});
