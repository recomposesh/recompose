import { beforeEach, describe, expect, test } from 'vitest';

import type { PickerStanding } from './canvas-standings';

import { heldDraft } from '../../lib/use-held-draft';
import { gateway } from './canvas-wiring.testkit';
import {
  canvasEnvironment,
  canvasLeftClean,
  draftHeld,
  worldWhereWritesLand,
} from './canvas-world.testkit';
import { droppedAt } from './picker-on-canvas.testkit';
import { boundThroughARouter } from './router-acts';
import { accounts, CANVAS } from './router-acts.testkit';

beforeEach(() => {
  canvasEnvironment();
  canvasLeftClean(CANVAS);
});

function askedFrom(from: string): PickerStanding {
  return { step: 'kind', from, at: droppedAt, origin: 'drop' };
}

describe('a router answering the binding ask from a bound definition', () => {
  test('the mode is asked before anything is written, never assumed to be failover', () => {
    const { world, record } = worldWhereWritesLand(gateway, {
      accounts,
      picker: askedFrom('model:fast'),
    });

    boundThroughARouter(world, 'model:fast');

    expect(record.written).toEqual([]);
    expect(record.announced).toEqual([]);
    expect(record.pickers.at(-1)).toMatchObject({ step: 'router-mode', from: 'model:fast' });
  });

  test('a definition that left the gateway is asked nothing, because no router can stand there', () => {
    const { world, record } = worldWhereWritesLand(gateway, {
      accounts,
      picker: askedFrom('model:absent'),
    });

    boundThroughARouter(world, 'model:absent');

    expect(record.written).toEqual([]);
    expect(record.pickers).toEqual([]);
  });
});

describe("a router answering the binding ask from another router's port", () => {
  test('nothing is nested straight away, because the mode a nest spreads by is asked first', () => {
    const { world, record } = worldWhereWritesLand(gateway, {
      accounts,
      picker: askedFrom('route:pooled'),
    });

    boundThroughARouter(world, 'route:pooled');

    expect(record.written).toEqual([]);
    expect(record.pickers.at(-1)).toMatchObject({ step: 'router-mode', from: 'route:pooled' });
  });

  test('an ask aimed at a target rather than a router asks nothing and nests nothing', () => {
    const { world, record } = worldWhereWritesLand(gateway, {
      accounts,
      picker: askedFrom('route:pooled:t1'),
    });

    boundThroughARouter(world, 'route:pooled:t1');

    expect(record.written).toEqual([]);
    expect(record.pickers).toEqual([]);
  });
});

describe('a router answering the binding ask from the held draft', () => {
  test('the mode is asked before the draft is finished, never assumed to be failover', () => {
    draftHeld(CANVAS, { displayName: 'Steady', id: 'steady', accountId: '', providerModel: '' });

    const { world, record } = worldWhereWritesLand(gateway, {
      accounts,
      picker: askedFrom('draft'),
    });

    boundThroughARouter(world, 'draft');

    expect(record.written).toEqual([]);
    expect(heldDraft(CANVAS)).toBeDefined();
    expect(record.pickers.at(-1)).toMatchObject({ step: 'router-mode', from: 'draft' });
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
