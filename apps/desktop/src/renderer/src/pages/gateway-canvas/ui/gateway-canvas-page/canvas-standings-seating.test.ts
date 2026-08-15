import { describe, expect, test } from 'vitest';

import type { CanvasNode } from '../../lib/node-graph';
import type { PickerStanding } from './canvas-standings';

import { overlayOf, seatsOf } from './canvas-standings';

const droppedAsk: PickerStanding = {
  step: 'account',
  from: 'draft',
  at: { x: 10, y: 20 },
  origin: 'drop',
};

const anchoredAsk: PickerStanding = {
  step: 'account',
  from: 'model:fast',
  anchor: 'target:fast',
};

const nothingOverlaid = { draft: undefined, pending: undefined };

describe('the two standings the graph draws beside engine truth', () => {
  test('a held draft stands as a card carrying what the person has typed so far', () => {
    expect(
      overlayOf(
        {
          definition: { displayName: 'Fast', id: 'fast', accountId: '', providerModel: '' },
          seat: { x: 40, y: 90 },
        },
        undefined,
      ).draft,
    ).toEqual({ modelId: 'fast', displayName: 'Fast', seat: { x: 40, y: 90 } });
  });

  test('no draft held stands no draft card', () => {
    expect(overlayOf(undefined, undefined).draft).toBeUndefined();
  });

  test('an ask holding its own point stands a card at the spot the cable was let go', () => {
    expect(overlayOf(undefined, droppedAsk).pending).toEqual({
      from: 'draft',
      at: { x: 10, y: 20 },
    });
  });

  test('an ask anchored to a stored card stands no card of its own', () => {
    expect(overlayOf(undefined, anchoredAsk).pending).toBeUndefined();
  });
});

describe('where every card stands', () => {
  test('a card nobody dragged takes the seat the tidy arrangement gives it', () => {
    const nodes: readonly CanvasNode[] = [
      { id: 'gateway', kind: 'gateway', displayName: 'My Gateway', port: 8397 },
    ];

    expect(seatsOf({ nodes, edges: [] }, {}, nothingOverlaid)).toEqual({
      gateway: { x: 0, y: 0 },
    });
  });

  test('a card a person dragged keeps the seat they left it at', () => {
    const nodes: readonly CanvasNode[] = [
      { id: 'gateway', kind: 'gateway', displayName: 'My Gateway', port: 8397 },
    ];

    expect(seatsOf({ nodes, edges: [] }, { gateway: { x: 500, y: 600 } }, nothingOverlaid)).toEqual(
      {
        gateway: { x: 500, y: 600 },
      },
    );
  });

  test('a seat for a card the canvas no longer stands seats nobody', () => {
    expect(
      seatsOf({ nodes: [], edges: [] }, { 'model:gone': { x: 5, y: 6 } }, nothingOverlaid),
    ).toEqual({});
  });
});

describe('where the two overlay cards stand', () => {
  test('the draft card sits exactly where the gesture that made it placed it', () => {
    const nodes: readonly CanvasNode[] = [
      { id: 'draft', kind: 'draft-model', modelId: 'fast', displayName: 'Fast' },
    ];

    expect(
      seatsOf(
        { nodes, edges: [] },
        {},
        {
          draft: { modelId: 'fast', displayName: 'Fast', seat: { x: 40, y: 90 } },
          pending: undefined,
        },
      )['draft'],
    ).toEqual({ x: 40, y: 90 });
  });

  test('the pending card sits exactly where the cable was let go', () => {
    const nodes: readonly CanvasNode[] = [{ id: 'pending', kind: 'pending-target' }];

    expect(
      seatsOf(
        { nodes, edges: [] },
        {},
        {
          draft: undefined,
          pending: { from: 'draft', at: { x: 10, y: 20 } },
        },
      )['pending'],
    ).toEqual({ x: 10, y: 20 });
  });

  test('an overlay card outranks the seat a person last dragged it to', () => {
    const nodes: readonly CanvasNode[] = [
      { id: 'draft', kind: 'draft-model', modelId: 'fast', displayName: 'Fast' },
    ];

    expect(
      seatsOf(
        { nodes, edges: [] },
        { draft: { x: 1, y: 2 } },
        {
          draft: { modelId: 'fast', displayName: 'Fast', seat: { x: 40, y: 90 } },
          pending: undefined,
        },
      )['draft'],
    ).toEqual({ x: 40, y: 90 });
  });
});
