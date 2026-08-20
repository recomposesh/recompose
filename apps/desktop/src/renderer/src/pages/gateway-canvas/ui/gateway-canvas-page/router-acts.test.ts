import { beforeEach, describe, expect, test } from 'vitest';

import { heldDraft } from '../../lib/use-held-draft';
import { gateway } from './canvas-wiring.testkit';
import {
  canvasEnvironment,
  canvasLeftClean,
  draftHeld,
  worldWhereWritesLand,
} from './canvas-world.testkit';
import { boundThroughARouter } from './router-acts';
import {
  accounts,
  CANVAS,
  ladderIn,
  modeIn,
  nodeWritten,
  routingWritten,
} from './router-acts.testkit';

beforeEach(() => {
  canvasEnvironment();
  canvasLeftClean(CANVAS);
});

describe('a router answering the binding ask from a bound definition', () => {
  test('the router stands where the binding stood, with what stood there beneath it', () => {
    const { world, record } = worldWhereWritesLand(gateway, { accounts });

    boundThroughARouter(world, 'model:fast');

    const routing = routingWritten(record, 'fast');

    expect(ladderIn(routing, routing?.entry)).toEqual(['node-fast']);
    expect(nodeWritten(routing, 'node-fast')).toEqual({
      kind: 'target',
      accountId: 'k1',
      providerModel: 'claude-haiku-4-5',
    });
  });

  test('a router is born spreading by failover, never by a mode nobody chose', () => {
    const { world, record } = worldWhereWritesLand(gateway, { accounts });

    boundThroughARouter(world, 'model:fast');

    const routing = routingWritten(record, 'fast');

    expect(modeIn(routing, routing?.entry)).toBe('failover');
  });

  test('the definition is announced as rebound, onto the router it now reaches', () => {
    const { world, record } = worldWhereWritesLand(gateway, { accounts });

    boundThroughARouter(world, 'model:fast');

    expect(record.announced).toEqual([
      { kind: 'rebound', virtualModel: 'Fast', target: 'Failover' },
    ]);
  });

  test('a definition that left the gateway is routed through nothing at all', () => {
    const { world, record } = worldWhereWritesLand(gateway, { accounts });

    boundThroughARouter(world, 'model:absent');

    expect(record.written).toEqual([]);
    expect(record.announced).toEqual([]);
  });
});

describe("a router answering the binding ask from another router's port", () => {
  test('nothing is nested straight away, because the mode a nest spreads by is asked first', () => {
    const { world, record } = worldWhereWritesLand(gateway, { accounts });

    boundThroughARouter(world, 'route:pooled');

    expect(record.written).toEqual([]);
    expect(record.announced).toEqual([]);
  });

  test('an ask aimed at a target rather than a router nests nothing and says nothing', () => {
    const { world, record } = worldWhereWritesLand(gateway, { accounts });

    boundThroughARouter(world, 'route:pooled:t1');

    expect(record.written).toEqual([]);
    expect(record.announced).toEqual([]);
  });
});

describe('a router answering the binding ask from the held draft', () => {
  test('the draft finishes as a stored definition routing through an empty router', () => {
    draftHeld(CANVAS, { displayName: 'Steady', id: 'steady', accountId: '', providerModel: '' });

    const { world, record } = worldWhereWritesLand(gateway, { accounts });

    boundThroughARouter(world, 'draft');

    const routing = routingWritten(record, 'steady');

    expect(modeIn(routing, routing?.entry)).toBe('failover');
    expect(ladderIn(routing, routing?.entry)).toEqual([]);
  });

  test('the finished draft leaves the canvas, announced as bound to the router', () => {
    draftHeld(CANVAS, { displayName: 'Steady', id: 'steady', accountId: '', providerModel: '' });

    const { world, record } = worldWhereWritesLand(gateway, { accounts });

    boundThroughARouter(world, 'draft');

    expect(heldDraft(CANVAS)).toBeUndefined();
    expect(record.announced).toEqual([
      { kind: 'bound', virtualModel: 'Steady', target: 'Failover' },
    ]);
  });
});

describe('a router answering a binding ask that left from nowhere a router can stand', () => {
  test('a target card holds no port, so an ask from one writes nothing', () => {
    const { world, record } = worldWhereWritesLand(gateway, { accounts });

    boundThroughARouter(world, 'target:fast');

    expect(record.written).toEqual([]);
    expect(record.announced).toEqual([]);
  });

  test("a router's port under a definition that has left nests nothing under nothing", () => {
    const { world, record } = worldWhereWritesLand(gateway, { accounts });

    boundThroughARouter(world, 'route:absent:r9');

    expect(record.written).toEqual([]);
    expect(record.announced).toEqual([]);
  });
});
