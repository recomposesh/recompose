import { describe, expect, test } from 'vitest';

import type { CanvasNode } from '../../lib/node-graph';
import type { CanvasAsks } from './canvas-wiring';

import { flowNodesOf } from './canvas-wiring';

const gatewayCard: CanvasNode = {
  id: 'gateway',
  kind: 'gateway',
  displayName: 'My Gateway',
  port: 8397,
};

const modelCard: CanvasNode = {
  id: 'model:fast',
  kind: 'virtual-model',
  modelId: 'fast',
  displayName: 'Fast',
  providerModel: 'claude-haiku-4-5',
};

const draftCard: CanvasNode = {
  id: 'draft',
  kind: 'draft-model',
  modelId: 'fast',
  displayName: 'Fast',
};

const routerCard: CanvasNode = {
  id: 'route:pooled',
  kind: 'router',
  modelId: 'pooled',
  routeNodeId: 'r1',
  depth: 1,
  mode: 'failover',
  displayName: undefined,
  childCount: 2,
};

const targetCard: CanvasNode = {
  id: 'target:pooled:t1',
  kind: 'target',
  account: { id: 'k1', provider: 'anthropic', kind: 'api-key', label: 'work', credentialRef: 'c1' },
  modelId: 'pooled',
  providerModel: 'claude-sonnet-5',
  routeNodeId: 't1',
  depth: 2,
};

function isPress(value: unknown): value is () => void {
  return typeof value === 'function';
}

function asksRecording(pressed: string[]): CanvasAsks {
  return {
    onAddVirtualModel: () => {
      pressed.push('gateway');
    },
    onBindFrom: (from) => {
      pressed.push(from);
    },
  };
}

function standing(node: CanvasNode, asks: CanvasAsks): Record<string, unknown> {
  return { ...flowNodesOf({ nodes: [node], edges: [] }, {}, undefined, asks)[0]?.data };
}

function press(node: CanvasNode, ask: string, asks: CanvasAsks): void {
  const hanging = standing(node, asks)[ask];

  if (!isPress(hanging)) {
    throw new Error(`no "${ask}" hangs off ${node.id}`);
  }

  hanging();
}

describe('the ask each card hangs off its port', () => {
  test('the gateway plus births a virtual model', () => {
    const pressed: string[] = [];

    press(gatewayCard, 'onAddVirtualModel', asksRecording(pressed));

    expect(pressed).toEqual(['gateway']);
  });

  test('a router plus binds one more child, naming the router the cable left', () => {
    const pressed: string[] = [];

    press(routerCard, 'onAddChild', asksRecording(pressed));

    expect(pressed).toEqual(['route:pooled']);
  });

  test('a virtual model opens the binding ask on its own card', () => {
    const pressed: string[] = [];

    press(modelCard, 'onPickTarget', asksRecording(pressed));

    expect(pressed).toEqual(['model:fast']);
  });

  test('a draft opens the same ask, naming the draft rather than the definition it holds', () => {
    const pressed: string[] = [];

    press(draftCard, 'onPickTarget', asksRecording(pressed));

    expect(pressed).toEqual(['draft']);
  });
});

describe('what a card carrying no ask stands on', () => {
  test('a target card carries its facts alone, because no plus hangs off it', () => {
    expect(Object.keys(standing(targetCard, asksRecording([]))).sort()).toEqual([
      'account',
      'depth',
      'id',
      'kind',
      'modelId',
      'providerModel',
      'routeNodeId',
    ]);
  });
});
