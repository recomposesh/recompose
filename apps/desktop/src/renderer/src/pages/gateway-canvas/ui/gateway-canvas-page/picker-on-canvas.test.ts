import { beforeEach, describe, expect, test } from 'vitest';

import { gateway } from './canvas-wiring.testkit';
import {
  canvasEnvironment,
  canvasLeftClean,
  draftHeld,
  worldWhereWritesHang,
  worldWhereWritesLand,
} from './canvas-world.testkit';
import { pickerOnCanvas } from './picker-on-canvas';
import {
  accountAnchored,
  accountDropped,
  draftNobodyBound,
  droppedAt,
  entryOf,
  groupsRead,
  kindDropped,
  modelDropped,
  modelsOffered,
  modelsRefused,
  pickerStanding,
  seatsOnTheCanvas,
  storedAccounts,
} from './picker-on-canvas.testkit';

beforeEach(() => {
  canvasEnvironment();
  canvasLeftClean(gateway.slug);
});

describe('a canvas with no pick standing open', () => {
  test('offers no picker at all, because nothing on it asked anything', () => {
    const { world } = worldWhereWritesHang(gateway);

    expect(pickerOnCanvas(world, modelsOffered)).toBeUndefined();
  });
});

describe('the stage the picker draws', () => {
  test('an ask that has settled nothing yet opens on what kind to bind', () => {
    const { world } = worldWhereWritesHang(gateway, { picker: kindDropped });

    expect(pickerStanding(world, modelsOffered).stage).toEqual({ step: 'kind' });
  });

  test('an ask that settled the kind stands on the account list', () => {
    const { world } = worldWhereWritesHang(gateway, { picker: accountDropped });

    expect(pickerStanding(world, modelsOffered).stage).toEqual({ step: 'account' });
  });

  test('an ask that settled the account carries it on to the model list', () => {
    const { world } = worldWhereWritesHang(gateway, { picker: modelDropped });

    expect(pickerStanding(world, modelsOffered).stage).toEqual({
      step: 'provider-model',
      accountId: 'k1',
    });
  });
});

describe('what the picker offers to pick from', () => {
  test('the account list offers every stored account, under the kind it is held as', () => {
    const { world } = worldWhereWritesHang(gateway, {
      picker: accountDropped,
      accounts: storedAccounts,
    });

    expect(groupsRead(pickerStanding(world, modelsOffered))).toEqual([
      { heading: 'API keys', ids: ['k1'] },
      { heading: 'Local runtimes', ids: ['l1'] },
    ]);
  });

  test('the model list offers the ids the account answered with, each reading as itself', () => {
    const { world } = worldWhereWritesHang(gateway, {
      picker: modelDropped,
      accounts: storedAccounts,
    });

    expect(pickerStanding(world, modelsOffered).groups).toEqual([
      {
        options: [
          { id: 'claude-haiku-4-5', name: 'claude-haiku-4-5' },
          { id: 'claude-opus-5', name: 'claude-opus-5' },
        ],
      },
    ]);
  });
});

describe('the refusal the picker shows in place of a list', () => {
  test('the model list says why an account answered with nothing', () => {
    const { world } = worldWhereWritesHang(gateway, { picker: modelDropped });

    expect(pickerStanding(world, modelsRefused).refusal).toBe('That account listed no models.');
  });

  test('the account list stays quiet, because no account has been asked about yet', () => {
    const { world } = worldWhereWritesHang(gateway, { picker: accountDropped });

    expect(pickerStanding(world, modelsRefused).refusal).toBeUndefined();
  });

  test('the kind list stays quiet too, since it asks nothing of any account', () => {
    const { world } = worldWhereWritesHang(gateway, { picker: kindDropped });

    expect(pickerStanding(world, modelsRefused).refusal).toBeUndefined();
  });
});

describe('where the picker stands on the canvas', () => {
  test('an ask carrying its own drop point stands on the pending card that drop raised', () => {
    const { world } = worldWhereWritesHang(gateway, {
      picker: accountDropped,
      seats: seatsOnTheCanvas,
    });

    expect(pickerStanding(world, modelsOffered).anchorSeat).toEqual({ x: 40, y: 60 });
  });

  test('an ask opened on a stored card stands on that card', () => {
    const { world } = worldWhereWritesHang(gateway, {
      picker: accountAnchored,
      seats: seatsOnTheCanvas,
    });

    expect(pickerStanding(world, modelsOffered).anchorSeat).toEqual({ x: 300, y: 90 });
  });

  test('an ask on a card the canvas seats nowhere falls back to the origin', () => {
    const { world } = worldWhereWritesHang(gateway, { picker: accountAnchored });

    expect(pickerStanding(world, modelsOffered).anchorSeat).toEqual({ x: 0, y: 0 });
  });
});

describe('answering what kind to bind', () => {
  test('picking the target carries the ask on to the account list, drop point and all', () => {
    const { world, record } = worldWhereWritesHang(gateway, { picker: kindDropped });

    pickerStanding(world, modelsOffered).onPickKind('target');

    expect(record.pickers).toEqual([
      { step: 'account', from: 'draft', at: droppedAt, origin: 'drop' },
    ]);
  });

  test('picking the router finishes the ask, on a router that holds nothing yet', () => {
    draftHeld(gateway.slug, draftNobodyBound);

    const { world, record } = worldWhereWritesLand(gateway, { picker: kindDropped });

    pickerStanding(world, modelsOffered).onPickKind('router');

    expect(entryOf(record.written.at(0), 'steady')).toEqual({
      kind: 'router',
      policy: { mode: 'failover' },
      children: [],
    });
    expect(record.pickers).toEqual([undefined]);
  });

  test('a kind arriving once the account list already stands changes nothing', () => {
    const { world, record } = worldWhereWritesHang(gateway, { picker: accountDropped });

    pickerStanding(world, modelsOffered).onPickKind('target');

    expect(record.pickers).toEqual([]);
    expect(record.written).toEqual([]);
  });
});

describe('answering which account', () => {
  test('a dropped cable moves on to the model list still holding where it was let go', () => {
    const { world, record } = worldWhereWritesHang(gateway, { picker: accountDropped });

    pickerStanding(world, modelsOffered).onPickAccount('k1');

    expect(record.pickers).toEqual([
      { step: 'provider-model', from: 'draft', accountId: 'k1', at: droppedAt, origin: 'drop' },
    ]);
  });

  test('an ask opened on a stored card moves on still holding the child it would replace', () => {
    const { world, record } = worldWhereWritesHang(gateway, { picker: accountAnchored });

    pickerStanding(world, modelsOffered).onPickAccount('k1');

    expect(record.pickers).toEqual([
      {
        step: 'provider-model',
        from: 'route:pooled',
        accountId: 'k1',
        anchor: 'target:pooled:t1',
        replacing: 't1',
      },
    ]);
  });

  test('an account arriving once the model list already stands changes nothing', () => {
    const { world, record } = worldWhereWritesHang(gateway, { picker: modelDropped });

    pickerStanding(world, modelsOffered).onPickAccount('l1');

    expect(record.pickers).toEqual([]);
  });
});
