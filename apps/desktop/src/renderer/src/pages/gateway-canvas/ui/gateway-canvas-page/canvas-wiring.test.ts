import type { Connection, NodeChange } from '@xyflow/react';

import { describe, expect, test } from 'vitest';

import { gatewaySeed } from '../../../../shared/testing';
import { movedSeats, oneTargetRule, subjectOf } from './canvas-wiring';

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
