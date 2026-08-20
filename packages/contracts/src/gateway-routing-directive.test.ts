import { describe, expect, test } from 'vitest';

import { routingSchema } from './gateway-routing';

type Refusal = { path: PropertyKey[]; message: string };

const DIRECTIVE = 'Treat a stack trace as code however politely it is asked about.';

function targetNode(accountId: string): Record<string, unknown> {
  return { kind: 'target', accountId, providerModel: 'a-real-model' };
}

function routingSortedBy(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    entry: 'sorter',
    nodes: {
      sorter: {
        kind: 'router',
        policy: {
          mode: 'conditional',
          judge: 'arbiter',
          branches: [{ label: 'code', rule: 'the request asks for code', child: 'coder' }],
          elseChild: 'chatter',
          judgeBoundMs: 2000,
          rejudgeEveryRequest: false,
          ...over,
        },
        children: ['coder', 'chatter'],
      },
      coder: targetNode('acc-coder'),
      chatter: targetNode('acc-chatter'),
      arbiter: targetNode('acc-arbiter'),
    },
  };
}

function refusalsFor(routing: Record<string, unknown>): Refusal[] {
  const parsed = routingSchema.safeParse(routing);

  return parsed.success
    ? []
    : parsed.error.issues.map(({ path, message }) => ({ path: [...path], message }));
}

describe('the standing instruction a person writes for one judge', () => {
  test('a directive stores beside the branches it is read ahead of', () => {
    const parsed = routingSchema.parse(routingSortedBy({ directive: DIRECTIVE }));
    const sorter = parsed.nodes['sorter'];

    expect(sorter?.kind === 'router' ? sorter.policy : undefined).toMatchObject({
      directive: DIRECTIVE,
    });
  });

  test('a router that names no directive stores and parses exactly as it always did', () => {
    const parsed = routingSchema.parse(routingSortedBy());
    const sorter = parsed.nodes['sorter'];
    const policy = sorter?.kind === 'router' ? sorter.policy : undefined;

    expect(policy?.mode === 'conditional' ? policy.directive : 'unread').toBeUndefined();
  });

  test('a blank directive is refused, and the refusal names the directive', () => {
    expect(
      refusalsFor(routingSortedBy({ directive: '   ' })).map((refusal) => refusal.path),
    ).toEqual([['nodes', 'sorter', 'policy', 'directive']]);
  });
});
