import type { Routing } from '@recompose/contracts';
import type { Connection, NodeChange } from '@xyflow/react';

import { describe, expect, test } from 'vitest';

import type { CanvasEdge, CanvasGraph } from '../../lib/node-graph';

import { gatewaySeed } from '../../../../shared/testing';
import { CABLE_GRAB_SPAN } from '../../lib/cable-standing';
import {
  bindingCableId,
  flowEdgesOf,
  flowNodesOf,
  movedSeats,
  oneTargetRule,
  targetAccountIdIn,
  targetModelIdOf,
} from './canvas-wiring';

function pulled(source: string, target: string): Connection {
  return { source, target, sourceHandle: null, targetHandle: null };
}

describe('the controlled flow applies position changes only', () => {
  test('a position change in flight moves a seat without settling it', () => {
    const changes: NodeChange[] = [
      { type: 'position', id: 'model:fast', position: { x: 10, y: 20 }, dragging: true },
    ];

    expect(movedSeats(changes)).toEqual([
      { id: 'model:fast', to: { x: 10, y: 20 }, settled: false },
    ]);
  });

  test('a position change at rest settles the seat', () => {
    const changes: NodeChange[] = [
      { type: 'position', id: 'model:fast', position: { x: 10, y: 20 }, dragging: false },
    ];

    expect(movedSeats(changes)).toEqual([
      { id: 'model:fast', to: { x: 10, y: 20 }, settled: true },
    ]);
  });

  test('every foreign change type changes nothing', () => {
    const changes: NodeChange[] = [
      { type: 'remove', id: 'model:fast' },
      { type: 'select', id: 'model:fast', selected: true },
      { type: 'dimensions', id: 'model:fast', dimensions: { width: 10, height: 10 } },
      {
        type: 'add',
        item: { id: 'intruder', position: { x: 0, y: 0 }, data: {} },
      },
      {
        type: 'replace',
        id: 'model:fast',
        item: { id: 'model:fast', position: { x: 0, y: 0 }, data: {} },
      },
    ];

    expect(movedSeats(changes)).toEqual([]);
  });

  test('a position change carrying no position moves nothing', () => {
    const changes: NodeChange[] = [{ type: 'position', id: 'model:fast', dragging: true }];

    expect(movedSeats(changes)).toEqual([]);
  });
});

function boundThrough(seat: string, accountId: string, providerModel: string): Routing {
  return { entry: seat, nodes: { [seat]: { kind: 'target', accountId, providerModel } } };
}

const gateway = gatewaySeed({
  slug: 'my-gateway',
  displayName: 'My Gateway',
  port: 8397,
  virtualModels: [
    {
      id: 'fast',
      displayName: 'Fast',
      routing: boundThrough('seat-fast', 'k1', 'claude-haiku-4-5'),
    },
    {
      id: 'creative',
      displayName: 'Creative',
      routing: boundThrough('seat-creative', 'g1', 'openai/gpt-5'),
    },
    {
      id: 'slow',
      displayName: 'Slow',
      routing: boundThrough('seat-slow', 'gone', 'claude-opus-5'),
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
  ],
});

describe('the one-target rule during a drag', () => {
  const valid = oneTargetRule(gateway);

  test('a cable from a virtual model onto another account rebinds, so it is welcome', () => {
    expect(valid(pulled('model:fast', 'target:creative'))).toBe(true);
  });

  test('a second cable onto the target already bound refuses', () => {
    expect(valid(pulled('model:fast', 'target:fast'))).toBe(false);
  });

  test('a draft takes any stored target', () => {
    expect(valid(pulled('draft', 'target:fast'))).toBe(true);
  });

  test('nothing lands on a card that is not a stored target', () => {
    expect(valid(pulled('model:fast', 'model:creative'))).toBe(false);
  });

  test('nothing leaves the gateway or a target by cable', () => {
    expect(valid(pulled('gateway', 'target:fast'))).toBe(false);
    expect(valid(pulled('target:fast', 'target:creative'))).toBe(false);
  });
});

describe('what the flow hands each card to stand on', () => {
  const graph: CanvasGraph = {
    nodes: [
      { id: 'gateway', kind: 'gateway', displayName: 'My Gateway', port: 8397 },
      {
        id: 'model:fast',
        kind: 'virtual-model',
        modelId: 'fast',
        displayName: 'Fast',
        providerModel: 'claude-haiku-4-5',
      },
    ],
    edges: [],
  };
  const asks = { onAddVirtualModel: () => {}, onBindFrom: () => {} };

  test('a card seats where the arrangement puts it', () => {
    const seated = flowNodesOf(graph, { 'model:fast': { x: 320, y: 140 } }, undefined, asks);

    expect(seated.find((node) => node.id === 'model:fast')?.position).toEqual({ x: 320, y: 140 });
  });

  test('a card the arrangement never seated stands at the origin rather than nowhere', () => {
    const seated = flowNodesOf(graph, {}, undefined, asks);

    expect(seated.map((node) => node.position)).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ]);
  });

  test('only the selected card reads as selected', () => {
    const seated = flowNodesOf(graph, {}, 'model:fast', asks);

    expect(seated.map((node) => node.selected)).toEqual([false, true]);
  });
});

describe('what the flow hands each cable to answer gestures by', () => {
  const drawn: readonly CanvasEdge[] = [
    {
      id: 'wire:model:fast',
      source: 'gateway',
      target: 'model:fast',
      standing: 'structural',
      failure: undefined,
    },
    {
      id: 'cable:fast',
      source: 'model:fast',
      target: 'target:k1',
      standing: 'resting',
      failure: undefined,
    },
    {
      id: 'wire:draft',
      source: 'gateway',
      target: 'draft',
      standing: 'structural',
      failure: undefined,
    },
    {
      id: 'overlay:draft',
      source: 'gateway',
      target: 'draft',
      standing: 'draft',
      failure: undefined,
    },
  ];

  test('a binding cable keeps the wide grab band its reconnect drag is sized by', () => {
    const cable = flowEdgesOf(drawn, undefined).find((edge) => edge.id === 'cable:fast');

    expect(cable).toMatchObject({ interactionWidth: CABLE_GRAB_SPAN });
    expect(cable?.selectable).toBeUndefined();
    expect(cable?.focusable).toBeUndefined();
  });

  test('a wire and an overlay cable answer no pointer and no keyboard, so the pane keeps both', () => {
    const inert = flowEdgesOf(drawn, undefined).filter((edge) => edge.id !== 'cable:fast');

    expect(inert).toHaveLength(3);

    for (const edge of inert) {
      expect(edge).toMatchObject({
        selectable: false,
        reconnectable: false,
        focusable: false,
        interactionWidth: 0,
      });
    }
  });
});

describe('what a failed cable hands the flow to stand on the path', () => {
  test('the error it carried travels with it, so a person can press it where it failed', () => {
    const refused = { status: 502, detail: 'The gateway could not reach the target.' };
    const failed: readonly CanvasEdge[] = [
      {
        id: 'cable:fast',
        source: 'model:fast',
        target: 'target:k1',
        standing: 'failed',
        failure: refused,
      },
    ];

    expect(flowEdgesOf(failed, undefined)[0]?.data).toEqual({
      standing: 'failed',
      failure: refused,
    });
  });
});

describe('what a route node card and cable name', () => {
  test('the model a child card belongs to reads without its route node riding along', () => {
    expect(targetModelIdOf('target:pooled:t1')).toBe('pooled');
    expect(targetModelIdOf('ghost:pooled:t2')).toBe('pooled');
    expect(targetModelIdOf('target:fast')).toBe('fast');
    expect(targetModelIdOf('route:pooled:t1')).toBeUndefined();
  });

  test('a cable below the entry still names the definition it serves', () => {
    expect(bindingCableId('cable:pooled:t1')).toBe('pooled');
    expect(bindingCableId('cable:fast')).toBe('fast');
    expect(bindingCableId('wire:model:fast')).toBeUndefined();
  });

  test('the account a child target holds is the one its own route node names', () => {
    expect(targetAccountIdIn(gateway, 'target:pooled:t1')).toBe('k1');
    expect(targetAccountIdIn(gateway, 'ghost:pooled:t2')).toBe('gone');
    expect(targetAccountIdIn(gateway, 'target:pooled')).toBeUndefined();
  });
});
