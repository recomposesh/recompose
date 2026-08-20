import type { Account, GatewayConfig, VirtualModel } from '@recompose/contracts';

import { GATEWAY_CONFIG_VERSION } from '@recompose/contracts';
import { expect, test } from 'vitest';

import type { CanvasNode } from './node-graph';

import { canvasGraph } from './node-graph';

const work: Account = {
  id: 'a1',
  provider: 'anthropic',
  kind: 'api-key',
  label: 'Work',
  credentialRef: 'c1',
};

const spare: Account = { ...work, id: 'a9', label: 'Spare', credentialRef: 'c9' };

const judgedModel: VirtualModel = {
  id: 'fast',
  displayName: 'Fast',
  routing: {
    entry: 'ladder',
    nodes: {
      ladder: {
        kind: 'router',
        policy: {
          mode: 'conditional',
          judge: 'advisor',
          branches: [{ label: 'code', rule: 'It writes code.', child: 'first' }],
          elseChild: 'second',
          judgeBoundMs: 3000,
          rejudgeEveryRequest: false,
        },
        children: ['first', 'second'],
      },
      first: { kind: 'target', accountId: 'a1', providerModel: 'claude-sonnet-5' },
      second: { kind: 'target', accountId: 'a1', providerModel: 'claude-opus-5' },
      advisor: { kind: 'target', accountId: 'a9', providerModel: 'claude-haiku-5' },
    },
  },
};

const codex: GatewayConfig = {
  schemaVersion: GATEWAY_CONFIG_VERSION,
  slug: 'codex',
  displayName: 'Codex',
  port: 8397,
  virtualModels: [judgedModel],
  layout: { nodes: {} },
};

function routerIn(accounts: readonly Account[]): CanvasNode | undefined {
  return canvasGraph(codex, accounts, { draft: undefined, pending: undefined }).nodes.find(
    (node) => node.kind === 'router',
  );
}

function judgeAnswersIn(accounts: readonly Account[]): boolean | undefined {
  const router = routerIn(accounts);

  return router?.kind === 'router' ? router.judged?.judgeAnswers : undefined;
}

test('a router whose judge holds an account the registry still knows says the judge answers', () => {
  expect(judgeAnswersIn([work, spare])).toBe(true);
});

test('a router whose judge lost its account says the judge no longer answers', () => {
  expect(judgeAnswersIn([work])).toBe(false);
});

test('the judge losing its account leaves the branch count the card prints alone', () => {
  const router = routerIn([work]);

  expect(router?.kind === 'router' ? router.judged?.branches : undefined).toBe(1);
});
