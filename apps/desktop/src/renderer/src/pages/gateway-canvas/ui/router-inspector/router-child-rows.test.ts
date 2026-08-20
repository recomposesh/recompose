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
  const rows = routerChildRows('fast', pooled, ['t1', 't2'], [workKey, spareKey]);

  expect(rows.map((row) => row.name)).toEqual(['work', 'spare']);
});

test('a child names the real model it serves under the account behind it', () => {
  const rows = routerChildRows('fast', pooled, ['t1', 't2'], [workKey, spareKey]);

  expect(rows).toEqual([
    {
      routeNodeId: 't1',
      cardId: 'target:fast:t1',
      name: 'work',
      detail: 'claude-sonnet-5',
      mark: 'anthropic',
    },
    {
      routeNodeId: 't2',
      cardId: 'target:fast:t2',
      name: 'spare',
      detail: 'claude-sonnet-5',
      mark: 'anthropic',
    },
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
  const rows = routerChildRows('fast', signedIn, ['t1'], [claudeSubscription]);

  expect(rows.map((row) => row.name)).toEqual(['personal plan']);
});

test('a child whose account left the registry keeps its id, so a broken row still points at one', () => {
  const rows = routerChildRows('fast', pooled, ['t1', 't2'], [workKey]);

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
  const rows = routerChildRows('fast', nested, ['r2'], [workKey, spareKey]);

  expect(rows).toEqual([
    {
      routeNodeId: 'r2',
      cardId: 'route:fast:r2',
      name: 'Round-robin',
      detail: '2 children',
      glyph: 'branch',
      glyphTint: 'text-router',
    },
  ]);
});

test('a child naming no node in the table stands no row at all', () => {
  const rows = routerChildRows('fast', pooled, ['t1', 'nowhere'], [workKey, spareKey]);

  expect(rows.map((row) => row.routeNodeId)).toEqual(['t1']);
});

test('the rows read in the order the stored ladder declares them', () => {
  const rows = routerChildRows('fast', pooled, ['t2', 't1'], [workKey, spareKey]);

  expect(rows.map((row) => row.name)).toEqual(['spare', 'work']);
});

const judging: Routing = {
  entry: 'r1',
  nodes: {
    r1: {
      kind: 'router',
      policy: {
        mode: 'conditional',
        judge: 'j1',
        branches: [{ label: 'code', rule: 'questions about source code', child: 't1' }],
        elseChild: 't2',
        judgeBoundMs: 3000,
        rejudgeEveryRequest: false,
      },
      children: ['t1', 't2'],
    },
    t1: { kind: 'target', accountId: 'k1', providerModel: 'claude-sonnet-5' },
    t2: { kind: 'target', accountId: 'k2', providerModel: 'claude-sonnet-5' },
    j1: { kind: 'target', accountId: 'k1', providerModel: 'claude-haiku-5' },
  },
};

function judgingPolicy() {
  const node = judging.nodes['r1'];

  if (node?.kind !== 'router' || node.policy.mode !== 'conditional') {
    throw new Error('the judging table holds no conditional router');
  }

  return node.policy;
}

function judgedRows(pins?: ReadonlyMap<string, number>) {
  return routerChildRows('fast', judging, ['t1', 't2'], [workKey, spareKey], {
    policy: judgingPolicy(),
    pins,
  });
}

test('a branch row carries the word the judge answers with for it', () => {
  expect(judgedRows()[0]).toMatchObject({ label: 'code' });
});

test('a branch row previews its rule, which the sheet holds whole', () => {
  expect(judgedRows()[0]).toMatchObject({ rule: 'questions about source code' });
});

test('the else row wears the word it answers to rather than a rule it does not have', () => {
  expect(judgedRows()[1]?.label).toBe('Else');
  expect(judgedRows()[1]?.rule).toBeUndefined();
});

test('the else row says why it cannot move or leave, rather than going missing without a word', () => {
  expect(judgedRows()[1]?.inertReason ?? '').toContain('else');
});

test('a branch row counts the conversations it currently holds', () => {
  expect(judgedRows(new Map([['t1', 3]]))[0]).toMatchObject({ pins: 3 });
});

test('a branch nobody is pinned to counts nothing rather than counting zero', () => {
  expect(judgedRows(new Map())[0]?.pins).toBeUndefined();
});

test('a child of a conditional router holding no branch yet wears no label and no rule', () => {
  const rows = routerChildRows('fast', judging, ['t2', 't1'], [workKey, spareKey], {
    policy: { ...judgingPolicy(), branches: [], elseChild: 't2' },
  });

  expect(rows[1]?.label).toBeUndefined();
  expect(rows[1]?.rule).toBeUndefined();
  expect(rows[1]?.inertReason).toBeUndefined();
});

test('a router that spreads some other way gives its rows no branch facts at all', () => {
  const rows = routerChildRows('fast', pooled, ['t1', 't2'], [workKey, spareKey]);

  expect(rows.every((row) => row.label === undefined && row.rule === undefined)).toBe(true);
});
