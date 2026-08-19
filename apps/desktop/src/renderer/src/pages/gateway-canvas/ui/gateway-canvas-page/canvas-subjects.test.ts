import type { Routing } from '@recompose/contracts';

import { describe, expect, test } from 'vitest';

import type { InspectorSubject } from './canvas-subjects';

import { gatewaySeed } from '../../../../shared/testing';
import { nodeIdOf, subjectOf } from './canvas-subjects';

function boundThrough(routeNodeId: string, accountId: string, providerModel: string): Routing {
  return {
    entry: routeNodeId,
    nodes: { [routeNodeId]: { kind: 'target', accountId, providerModel } },
  };
}

const gateway = gatewaySeed({
  slug: 'my-gateway',
  displayName: 'My Gateway',
  port: 8397,
  virtualModels: [
    {
      id: 'fast',
      displayName: 'Fast',
      routing: boundThrough('node-fast', 'k1', 'claude-haiku-4-5'),
    },
    {
      id: 'creative',
      displayName: 'Creative',
      routing: boundThrough('node-creative', 'g1', 'openai/gpt-5'),
    },
    {
      id: 'slow',
      displayName: 'Slow',
      routing: boundThrough('node-slow', 'gone', 'claude-opus-5'),
    },
    {
      id: 'pooled',
      displayName: 'Pooled',
      routing: {
        entry: 'r1',
        nodes: {
          r1: { kind: 'router', policy: { mode: 'failover' }, children: ['t1', 't2'] },
          t1: { kind: 'target', accountId: 'k1', providerModel: 'claude-haiku-4-5' },
          t2: { kind: 'target', accountId: 'gone', providerModel: 'claude-opus-5' },
        },
      },
    },
    {
      id: 'judged',
      displayName: 'Judged',
      routing: {
        entry: 'r3',
        nodes: {
          r3: {
            kind: 'router',
            policy: {
              mode: 'conditional',
              judge: 'advisor',
              branches: [{ label: 'code', rule: 'It writes code.', child: 'c1' }],
              elseChild: 'c2',
              judgeBoundMs: 3000,
              rejudgeEveryRequest: false,
            },
            children: ['c1', 'c2'],
          },
          c1: { kind: 'target', accountId: 'k1', providerModel: 'claude-sonnet-5' },
          c2: { kind: 'target', accountId: 'k1', providerModel: 'claude-opus-5' },
          advisor: { kind: 'target', accountId: 'k1', providerModel: 'claude-haiku-4-5' },
        },
      },
    },
    {
      id: 'migrated',
      displayName: 'Migrated',
      routing: {
        entry: 'r2',
        nodes: {
          r2: { kind: 'router', policy: { mode: 'failover' }, children: ['seat:migrated'] },
          'seat:migrated': {
            kind: 'target',
            accountId: 'k1',
            providerModel: 'claude-sonnet-5',
          },
        },
      },
    },
  ],
});

describe('the selection subject the inspector reads', () => {
  test('nothing selected reads as the gateway', () => {
    expect(subjectOf(gateway, undefined)).toEqual({ kind: 'gateway' });
  });

  test('every card and cable names its subject', () => {
    expect(subjectOf(gateway, 'gateway')).toEqual({ kind: 'gateway' });
    expect(subjectOf(gateway, 'model:fast')).toEqual({ kind: 'virtual-model', modelId: 'fast' });
    expect(subjectOf(gateway, 'cable:fast')).toEqual({ kind: 'cable', modelId: 'fast' });
    expect(subjectOf(gateway, 'target:fast')).toEqual({
      kind: 'target',
      accountId: 'k1',
      modelId: 'fast',
    });
    expect(subjectOf(gateway, 'ghost:slow')).toEqual({
      kind: 'ghost-target',
      accountId: 'gone',
      modelId: 'slow',
    });
    expect(subjectOf(gateway, 'draft')).toEqual({ kind: 'draft' });
  });

  test('a selection with no body of its own falls back to the gateway', () => {
    expect(subjectOf(gateway, 'pending')).toEqual({ kind: 'gateway' });
    expect(subjectOf(gateway, 'target:gone-model')).toEqual({ kind: 'gateway' });
  });
});

describe('the subject a card below a routing entry reads as', () => {
  test('a card below the entry names the route node it seats at rather than only its model', () => {
    expect(subjectOf(gateway, 'target:pooled:t1')).toEqual({
      kind: 'target',
      accountId: 'k1',
      modelId: 'pooled',
      routeNodeId: 't1',
    });
    expect(subjectOf(gateway, 'ghost:pooled:t2')).toEqual({
      kind: 'ghost-target',
      accountId: 'gone',
      modelId: 'pooled',
      routeNodeId: 't2',
    });
  });

  test('a card standing a route node the migration minted names its own binding', () => {
    expect(subjectOf(gateway, 'target:migrated:seat:migrated')).toEqual({
      kind: 'target',
      accountId: 'k1',
      modelId: 'migrated',
      routeNodeId: 'seat:migrated',
    });
  });

  test('a router card reads as the router it stands for', () => {
    expect(subjectOf(gateway, 'route:pooled')).toEqual({
      kind: 'router',
      modelId: 'pooled',
      routeNodeId: undefined,
    });
  });

  test('a card naming a route node the table never held falls back to the gateway', () => {
    expect(subjectOf(gateway, 'route:pooled:nowhere')).toEqual({ kind: 'gateway' });
    expect(subjectOf(gateway, 'route:fast')).toEqual({ kind: 'gateway' });
  });

  test('a cable below the entry still speaks for the binding its model holds', () => {
    expect(subjectOf(gateway, 'cable:pooled:t1')).toEqual({
      kind: 'cable',
      modelId: 'pooled',
      routeNodeId: 't1',
    });
  });
});

describe('the subject a judge reads as', () => {
  test('the judge reads as its own subject, so keyboard focus reaches the advisor', () => {
    expect(subjectOf(gateway, 'judge:judged:advisor')).toEqual({
      kind: 'judge',
      modelId: 'judged',
      routeNodeId: 'advisor',
    });
  });

  test('a card naming a target no policy judges by falls back to the gateway', () => {
    expect(subjectOf(gateway, 'judge:judged:c1')).toEqual({ kind: 'gateway' });
    expect(subjectOf(gateway, 'judge:pooled:t1')).toEqual({ kind: 'gateway' });
  });
});

describe('the card a subject stands for', () => {
  test('the gateway stands for no card, because it is what the whole screen is about', () => {
    expect(nodeIdOf({ kind: 'gateway' })).toBeUndefined();
  });

  test('every subject with a card of its own names it', () => {
    const named: readonly [InspectorSubject, string][] = [
      [{ kind: 'virtual-model', modelId: 'fast' }, 'model:fast'],
      [{ kind: 'cable', modelId: 'fast' }, 'cable:fast'],
      [{ kind: 'target', accountId: 'k1', modelId: 'fast' }, 'target:fast'],
      [{ kind: 'ghost-target', accountId: 'gone', modelId: 'slow' }, 'ghost:slow'],
      [{ kind: 'router', modelId: 'pooled', routeNodeId: undefined }, 'route:pooled'],
      [{ kind: 'judge', modelId: 'judged', routeNodeId: 'advisor' }, 'judge:judged:advisor'],
      [
        { kind: 'target', accountId: 'k1', modelId: 'pooled', routeNodeId: 't1' },
        'target:pooled:t1',
      ],
      [{ kind: 'draft' }, 'draft'],
    ];

    expect(named.map(([subject]) => nodeIdOf(subject))).toEqual(named.map(([, id]) => id));
  });

  test('naming a subject and reading it back lands on the very same subject', () => {
    const every: readonly InspectorSubject[] = [
      { kind: 'gateway' },
      { kind: 'virtual-model', modelId: 'fast' },
      { kind: 'cable', modelId: 'fast' },
      { kind: 'target', accountId: 'k1', modelId: 'fast' },
      { kind: 'ghost-target', accountId: 'gone', modelId: 'slow' },
      { kind: 'router', modelId: 'pooled', routeNodeId: undefined },
      { kind: 'judge', modelId: 'judged', routeNodeId: 'advisor' },
      { kind: 'target', accountId: 'k1', modelId: 'pooled', routeNodeId: 't1' },
      { kind: 'draft' },
    ];

    expect(every.map((subject) => subjectOf(gateway, nodeIdOf(subject)))).toEqual(every);
  });
});
