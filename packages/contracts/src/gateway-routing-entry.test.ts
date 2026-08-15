import { describe, expect, test } from 'vitest';

import { routingSchema, targetTheEntryNames } from './gateway-routing';

function oneNodeGraph(accountId: string): unknown {
  return {
    entry: 't1',
    nodes: { t1: { kind: 'target', accountId, providerModel: 'a-real-model' } },
  };
}

function routerOverOneTarget(): unknown {
  return {
    entry: 'ladder',
    nodes: {
      ladder: { kind: 'router', policy: { mode: 'failover' }, children: ['first'] },
      first: { kind: 'target', accountId: 'acc-openrouter', providerModel: 'a-real-model' },
    },
  };
}

describe('the one target a virtual model binds', () => {
  test('a graph of one node names that node as the target it binds', () => {
    const routing = routingSchema.parse(oneNodeGraph('acc-claude-max'));

    expect(targetTheEntryNames(routing)).toEqual({
      kind: 'target',
      accountId: 'acc-claude-max',
      providerModel: 'a-real-model',
    });
  });

  test('a graph standing on a router binds no single target, however few children it holds', () => {
    const routing = routingSchema.parse(routerOverOneTarget());

    expect(targetTheEntryNames(routing)).toBeUndefined();
  });

  test('a table nobody parsed answers nothing rather than throwing when its entry resolves to no node', () => {
    const drafted = { entry: 'nowhere', nodes: {} };

    expect(targetTheEntryNames(drafted)).toBeUndefined();
  });
});
