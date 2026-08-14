import type { Account, Routing } from '@recompose/contracts';

import { expect, test } from 'vitest';

import { routerChildRows } from './router-child-rows';

const workKey: Account = {
  id: 'k1',
  provider: 'anthropic',
  kind: 'api-key',
  label: 'work',
  credentialRef: 'c1',
};

const spareKey: Account = {
  id: 'k2',
  provider: 'anthropic',
  kind: 'api-key',
  label: 'spare',
  credentialRef: 'c2',
};

const claudeSubscription: Account = {
  id: 's1',
  provider: 'anthropic',
  kind: 'subscription',
  provenance: 'sign-in',
  label: 'personal plan',
};

const pooled: Routing = {
  entry: 'r1',
  nodes: {
    r1: { kind: 'router', policy: { mode: 'failover' }, children: ['t1', 't2'] },
    t1: { kind: 'target', accountId: 'k1', providerModel: 'claude-sonnet-5' },
    t2: { kind: 'target', accountId: 'k2', providerModel: 'claude-sonnet-5' },
  },
};

test('two accounts of one provider read as two children a person can tell apart', () => {
  const rows = routerChildRows(pooled, ['t1', 't2'], [workKey, spareKey]);

  expect(rows.map((row) => row.name)).toEqual(['work', 'spare']);
});

test('a child names the real model it serves under the account behind it', () => {
  const rows = routerChildRows(pooled, ['t1', 't2'], [workKey, spareKey]);

  expect(rows).toEqual([
    { routeNodeId: 't1', name: 'work', detail: 'claude-sonnet-5' },
    { routeNodeId: 't2', name: 'spare', detail: 'claude-sonnet-5' },
  ]);
});

test('a subscription child reads the name it was filed under rather than its vendor product', () => {
  const signedIn: Routing = {
    entry: 'r1',
    nodes: {
      r1: { kind: 'router', policy: { mode: 'failover' }, children: ['t1'] },
      t1: { kind: 'target', accountId: 's1', providerModel: 'claude-opus-5' },
    },
  };
  const rows = routerChildRows(signedIn, ['t1'], [claudeSubscription]);

  expect(rows.map((row) => row.name)).toEqual(['personal plan']);
});

test('a child whose account left the registry keeps its id, so a broken row still points at one', () => {
  const rows = routerChildRows(pooled, ['t1', 't2'], [workKey]);

  expect(rows.map((row) => row.name)).toEqual(['work', 'k2']);
});

test('a nested router names itself and how many children it holds', () => {
  const nested: Routing = {
    entry: 'r1',
    nodes: {
      r1: { kind: 'router', policy: { mode: 'failover' }, children: ['r2'] },
      r2: { kind: 'router', policy: { mode: 'round-robin' }, children: ['t1', 't2'] },
      t1: { kind: 'target', accountId: 'k1', providerModel: 'claude-sonnet-5' },
      t2: { kind: 'target', accountId: 'k2', providerModel: 'claude-sonnet-5' },
    },
  };
  const rows = routerChildRows(nested, ['r2'], [workKey, spareKey]);

  expect(rows).toEqual([{ routeNodeId: 'r2', name: 'Round-robin', detail: '2 children' }]);
});

test('a child naming no node in the table stands no row at all', () => {
  const rows = routerChildRows(pooled, ['t1', 'nowhere'], [workKey, spareKey]);

  expect(rows.map((row) => row.routeNodeId)).toEqual(['t1']);
});

test('the rows read in the order the stored ladder declares them', () => {
  const rows = routerChildRows(pooled, ['t2', 't1'], [workKey, spareKey]);

  expect(rows.map((row) => row.name)).toEqual(['spare', 'work']);
});
