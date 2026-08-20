import type { Account, GatewayConfig, GatewayCooldowns, VirtualModel } from '@recompose/contracts';

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
      advisor: { kind: 'target', accountId: 'a1', providerModel: 'claude-haiku-5' },
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

const NOON = new Date(2026, 7, 20, 12, 0, 0).getTime();

const FIVE_PAST = NOON + 300_000;

function judgeIn(cooling: GatewayCooldowns, now = NOON): CanvasNode | undefined {
  const nothingOverlaid = { draft: undefined, pending: undefined };

  return canvasGraph(codex, [work], nothingOverlaid, {}, [], now, { cooling }).nodes.find(
    (node) => node.kind === 'judge',
  );
}

function standingOf(node: CanvasNode | undefined): string | undefined {
  return node?.kind === 'judge' ? node.standing : undefined;
}

test('a judge nothing stood down rests, so its caption spends itself on the model', () => {
  expect(standingOf(judgeIn({}))).toBe('resting');
});

test('a judge standing out of a cooldown wears its cooling state on the canvas', () => {
  expect(standingOf(judgeIn({ codex: { fast: { advisor: FIVE_PAST } } }))).toBe('cooling');
});

test('a judge whose window already passed rests again without anything pushing it back', () => {
  expect(standingOf(judgeIn({ codex: { fast: { advisor: FIVE_PAST } } }, FIVE_PAST))).toBe(
    'resting',
  );
});

test('a cooldown under some other gateway never stands this judge down', () => {
  expect(standingOf(judgeIn({ work: { fast: { advisor: FIVE_PAST } } }))).toBe('resting');
});

test('a cooldown on a child of the router never stands the judge beside it down', () => {
  expect(standingOf(judgeIn({ codex: { fast: { first: FIVE_PAST } } }))).toBe('resting');
});
