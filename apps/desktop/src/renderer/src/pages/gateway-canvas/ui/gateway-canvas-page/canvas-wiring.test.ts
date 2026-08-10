import type { Connection, NodeChange } from '@xyflow/react';

import { describe, expect, test } from 'vitest';

import type { CanvasEdge, CanvasGraph } from '../../lib/node-graph';

import { gatewaySeed } from '../../../../shared/testing';
import { CABLE_GRAB_SPAN } from '../../lib/cable-standing';
import { flowEdgesOf, flowNodesOf, movedSeats, oneTargetRule, subjectOf } from './canvas-wiring';

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

const gateway = gatewaySeed({
  slug: 'my-gateway',
  displayName: 'My Gateway',
  port: 8397,
  virtualModels: [
    {
      id: 'fast',
      displayName: 'Fast',
      target: { accountId: 'k1', providerModel: 'claude-haiku-4-5' },
    },
  ],
});

describe('the one-target rule during a drag', () => {
  const valid = oneTargetRule(gateway);

  test('a cable from a virtual model onto another account rebinds, so it is welcome', () => {
    expect(valid(pulled('model:fast', 'target:g1'))).toBe(true);
  });

  test('a second cable onto the target already bound refuses', () => {
    expect(valid(pulled('model:fast', 'target:k1'))).toBe(false);
  });

  test('a draft takes any stored target', () => {
    expect(valid(pulled('draft', 'target:k1'))).toBe(true);
  });

  test('nothing lands on a card that is not a stored target', () => {
    expect(valid(pulled('model:fast', 'ghost:gone'))).toBe(false);
    expect(valid(pulled('model:fast', 'model:creative'))).toBe(false);
  });

  test('nothing leaves the gateway or a target by cable', () => {
    expect(valid(pulled('gateway', 'target:k1'))).toBe(false);
    expect(valid(pulled('target:k1', 'target:g1'))).toBe(false);
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
  const asks = { onAddVirtualModel: () => {}, onPickTargetFor: () => {} };

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

describe('the selection subject the inspector reads', () => {
  test('nothing selected reads as the gateway', () => {
    expect(subjectOf(undefined)).toEqual({ kind: 'gateway' });
  });

  test('every card and cable names its subject', () => {
    expect(subjectOf('gateway')).toEqual({ kind: 'gateway' });
    expect(subjectOf('model:fast')).toEqual({ kind: 'virtual-model', modelId: 'fast' });
    expect(subjectOf('cable:fast')).toEqual({ kind: 'cable', modelId: 'fast' });
    expect(subjectOf('target:k1')).toEqual({ kind: 'target', accountId: 'k1' });
    expect(subjectOf('ghost:gone')).toEqual({ kind: 'ghost-target', accountId: 'gone' });
    expect(subjectOf('draft')).toEqual({ kind: 'draft' });
  });

  test('a selection with no body of its own falls back to the gateway', () => {
    expect(subjectOf('pending')).toEqual({ kind: 'gateway' });
    expect(subjectOf('overlay:draft')).toEqual({ kind: 'gateway' });
  });
});
