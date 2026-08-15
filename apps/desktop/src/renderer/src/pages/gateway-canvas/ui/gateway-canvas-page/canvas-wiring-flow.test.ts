import type { NodeChange } from '@xyflow/react';

import { describe, expect, test } from 'vitest';

import type { CanvasEdge, CanvasGraph } from '../../lib/node-graph';

import { CABLE_GRAB_SPAN } from '../../lib/cable-standing';
import { CARD_MEASURE, flowEdgesOf, flowNodesOf, movedSeats } from './canvas-wiring';

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

  test('a card stands under its own kind, carrying the measure edges draw against', () => {
    const seated = flowNodesOf(graph, {}, undefined, asks);

    expect(seated.map((node) => node.type)).toEqual(['gateway', 'virtual-model']);
    expect(seated.map((node) => ({ width: node.width, height: node.height }))).toEqual([
      CARD_MEASURE,
      CARD_MEASURE,
    ]);
  });
});

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

describe('what every cable draws as', () => {
  test('one cable each, between the two cards its own ends name', () => {
    const drawnAs = flowEdgesOf(drawn, undefined);

    expect(drawnAs.map((edge) => [edge.id, edge.type, edge.source, edge.target])).toEqual([
      ['wire:model:fast', 'cable', 'gateway', 'model:fast'],
      ['cable:fast', 'cable', 'model:fast', 'target:k1'],
      ['wire:draft', 'cable', 'gateway', 'draft'],
      ['overlay:draft', 'cable', 'gateway', 'draft'],
    ]);
  });

  test('only the selected cable reads as selected', () => {
    expect(flowEdgesOf(drawn, 'cable:fast').map((edge) => edge.selected)).toEqual([
      false,
      true,
      false,
      false,
    ]);
  });
});

describe('what the flow hands each cable to answer gestures by', () => {
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
