import { describe, expect, test } from 'vitest';

import { loadGatewayConfig } from './gateway-config';

function conditionalRouterStoredAt(judgeBoundMs: number): Record<string, unknown> {
  return {
    schemaVersion: 4,
    slug: 'codex',
    displayName: 'Codex',
    port: 8397,
    layout: { nodes: {} },
    virtualModels: [
      {
        id: 'fast',
        displayName: 'Fast',
        routing: {
          entry: 'r1',
          nodes: {
            r1: {
              kind: 'router',
              children: ['c1', 'c2'],
              policy: {
                mode: 'conditional',
                judge: 'j1',
                branches: [{ label: 'code', rule: 'questions about source code', child: 'c1' }],
                elseChild: 'c2',
                judgeBoundMs,
                rejudgeEveryRequest: true,
              },
            },
            j1: { kind: 'target', accountId: 'a9', providerModel: 'claude-haiku-5' },
            c1: { kind: 'target', accountId: 'a1', providerModel: 'claude-sonnet-5' },
            c2: { kind: 'target', accountId: 'a2', providerModel: 'claude-opus-5' },
          },
        },
      },
    ],
  };
}

function budgetAfterLoading(judgeBoundMs: number): number | undefined {
  const loaded = loadGatewayConfig(conditionalRouterStoredAt(judgeBoundMs));
  const node = loaded.virtualModels[0]?.routing.nodes['r1'];

  return node?.kind === 'router' && node.policy.mode === 'conditional'
    ? node.policy.judgeBoundMs
    : undefined;
}

describe('the judge budget a stored gateway comes back with', () => {
  test('a router still carrying the three seconds nobody chose waits half a minute instead', () => {
    expect(budgetAfterLoading(3000)).toBe(30_000);
  });

  test('a budget a person set stands exactly where they set it', () => {
    expect(budgetAfterLoading(7000)).toBe(7000);
  });

  test('the lift moves the budget and nothing else the router decides by', () => {
    const loaded = loadGatewayConfig(conditionalRouterStoredAt(3000));
    const node = loaded.virtualModels[0]?.routing.nodes['r1'];

    expect(node?.kind === 'router' ? node.policy : undefined).toEqual({
      mode: 'conditional',
      judge: 'j1',
      branches: [{ label: 'code', rule: 'questions about source code', child: 'c1' }],
      elseChild: 'c2',
      judgeBoundMs: 30_000,
      rejudgeEveryRequest: true,
    });
  });
});

describe('a stored gateway the lift cannot read', () => {
  test('a routing the stored shape refuses still refuses by naming the routing', () => {
    const stored = {
      ...conditionalRouterStoredAt(3000),
      virtualModels: [{ id: 'fast', displayName: 'Fast', routing: 'nope' }],
    };

    expect(() => loadGatewayConfig(stored)).toThrow(/routing/u);
  });

  test('a routing that names an entry but holds no table refuses by naming the table', () => {
    const stored = {
      ...conditionalRouterStoredAt(3000),
      virtualModels: [{ id: 'fast', displayName: 'Fast', routing: { entry: 't1' } }],
    };

    expect(() => loadGatewayConfig(stored)).toThrow(/nodes/u);
  });

  test('a gateway holding no list of models refuses by naming the models, keeping its stamp', () => {
    const stored = { ...conditionalRouterStoredAt(3000), virtualModels: 'fast' };

    expect(() => loadGatewayConfig(stored)).toThrow(/virtualModels/u);
  });
});

describe('a stored gateway holding no conditional router', () => {
  test('a table with no conditional router in it comes back untouched', () => {
    const stored = {
      schemaVersion: 4,
      slug: 'codex',
      displayName: 'Codex',
      port: 8397,
      layout: { nodes: {} },
      virtualModels: [
        {
          id: 'fast',
          displayName: 'Fast',
          routing: {
            entry: 't1',
            nodes: { t1: { kind: 'target', accountId: 'a1', providerModel: 'claude-sonnet-5' } },
          },
        },
      ],
    };

    expect(loadGatewayConfig(stored)).toEqual({ ...stored, schemaVersion: 5 });
  });
});
