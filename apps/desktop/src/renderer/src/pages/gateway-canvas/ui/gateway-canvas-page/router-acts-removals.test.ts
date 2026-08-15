import { beforeEach, describe, expect, test } from 'vitest';

import { closeInspector, inspectorOpen, toggleInspector } from '../../../../shared/lib';
import { heldDraft } from '../../lib/use-held-draft';
import { gateway } from './canvas-wiring.testkit';
import {
  canvasEnvironment,
  canvasLeftClean,
  worldWhereWritesAreRefused,
  worldWhereWritesLand,
} from './canvas-world.testkit';
import { removedRouteNode } from './router-acts';
import {
  accounts,
  CANVAS,
  definitionsWritten,
  ladderIn,
  nodeWritten,
  routingWritten,
} from './router-acts.testkit';

beforeEach(() => {
  canvasEnvironment();
  canvasLeftClean(CANVAS);
  closeInspector();
});

describe('a route node taken off the canvas', () => {
  test('removing the card a definition binds through releases the whole definition', () => {
    const { world, record } = worldWhereWritesLand(gateway, { accounts });

    removedRouteNode(world, 'target:fast');

    expect(definitionsWritten(record)).toEqual(['creative', 'slow', 'pooled']);
    expect(heldDraft(CANVAS)?.definition.displayName).toBe('Fast');
  });

  test('removing a child of a ladder thins the pool by one and leaves its siblings', () => {
    const { world, record } = worldWhereWritesLand(gateway, { accounts });

    removedRouteNode(world, 'target:pooled:t1');

    const routing = routingWritten(record, 'pooled');

    expect(ladderIn(routing, 'r1')).toEqual(['t2']);
    expect(nodeWritten(routing, 't1')).toBeUndefined();
  });

  test('a removal that lands puts the selection down and closes the inspector', () => {
    toggleInspector();

    const { world, record } = worldWhereWritesLand(gateway, { accounts });

    removedRouteNode(world, 'target:pooled:t1');

    expect(record.selected).toEqual([undefined]);
    expect(inspectorOpen()).toBe(false);
  });

  test('a refused removal says why and leaves the canvas standing as it was', () => {
    toggleInspector();

    const refusal = new Error('recompose could not rewrite the gateway.');
    const { world, record } = worldWhereWritesAreRefused(gateway, refusal, { accounts });

    removedRouteNode(world, 'target:pooled:t1');

    expect(record.refused).toEqual([refusal]);
    expect(record.selected).toEqual([]);
    expect(inspectorOpen()).toBe(true);
  });

  test('a card standing for a definition that left the gateway removes nothing', () => {
    const { world, record } = worldWhereWritesLand(gateway, { accounts });

    removedRouteNode(world, 'target:absent');

    expect(record.written).toEqual([]);
    expect(record.selected).toEqual([]);
  });

  test('a card wearing no route prefix removes nothing, even when it names a definition', () => {
    const { world, record } = worldWhereWritesLand(gateway, { accounts });

    removedRouteNode(world, 'fast');

    expect(record.written).toEqual([]);
    expect(record.selected).toEqual([]);
  });
});
