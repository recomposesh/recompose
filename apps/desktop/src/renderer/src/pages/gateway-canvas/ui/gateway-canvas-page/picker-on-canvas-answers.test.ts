import { beforeEach, describe, expect, test } from 'vitest';

import { gateway } from './canvas-wiring.testkit';
import {
  canvasEnvironment,
  canvasLeftClean,
  draftHeld,
  worldWhereWritesHang,
} from './canvas-world.testkit';
import {
  accountAnchored,
  accountDropped,
  draftNobodyBound,
  droppedAt,
  entryOf,
  kindDropped,
  ladderUnder,
  modelAnchored,
  modelDropped,
  modelsOffered,
  pickerStanding,
} from './picker-on-canvas.testkit';

beforeEach(() => {
  canvasEnvironment();
  canvasLeftClean(gateway.slug);
});

describe('answering which real model, on a definition of its own', () => {
  test('a draft becomes a whole definition the gateway serves', () => {
    draftHeld(gateway.slug, draftNobodyBound);

    const { world, record } = worldWhereWritesHang(gateway, { picker: modelDropped });

    pickerStanding(world, modelsOffered).onPickProviderModel('claude-opus-5');

    expect(record.written.at(0)?.virtualModels.map((model) => model.id)).toEqual([
      'fast',
      'creative',
      'slow',
      'pooled',
      'steady',
    ]);
    expect(entryOf(record.written.at(0), 'steady')).toEqual({
      kind: 'target',
      accountId: 'k1',
      providerModel: 'claude-opus-5',
    });
  });

  test("a virtual model's own cable aims that definition at the picked target", () => {
    const { world, record } = worldWhereWritesHang(gateway, {
      picker: {
        step: 'provider-model',
        from: 'model:fast',
        accountId: 'l1',
        anchor: 'target:fast',
      },
    });

    pickerStanding(world, modelsOffered).onPickProviderModel('gpt-oss');

    expect(record.written.at(0)?.virtualModels.map((model) => model.id)).toEqual([
      'fast',
      'creative',
      'slow',
      'pooled',
    ]);
    expect(entryOf(record.written.at(0), 'fast')).toEqual({
      kind: 'target',
      accountId: 'l1',
      providerModel: 'gpt-oss',
    });
  });
});

describe('answering which real model, on a cable off a router', () => {
  test('a cable off a router binds one more child, at the end of the ladder', () => {
    const { world, record } = worldWhereWritesHang(gateway, {
      picker: {
        step: 'provider-model',
        from: 'route:pooled',
        accountId: 'l1',
        at: droppedAt,
        origin: 'drop',
      },
    });

    pickerStanding(world, modelsOffered).onPickProviderModel('gpt-oss');

    expect(ladderUnder(record.written.at(0), 'pooled', 'r1')).toEqual([
      { kind: 'target', accountId: 'k1', providerModel: 'claude-haiku-4-5' },
      { kind: 'target', accountId: 'gone', providerModel: 'claude-opus-5' },
      { kind: 'target', accountId: 'l1', providerModel: 'gpt-oss' },
    ]);
  });

  test('a cable that already ended at a child moves that child rather than growing the ladder', () => {
    const { world, record } = worldWhereWritesHang(gateway, {
      picker: {
        step: 'provider-model',
        from: 'route:pooled',
        accountId: 'l1',
        anchor: 'target:pooled:t1',
        replacing: 't1',
      },
    });

    pickerStanding(world, modelsOffered).onPickProviderModel('gpt-oss');

    expect(ladderUnder(record.written.at(0), 'pooled', 'r1')).toEqual([
      { kind: 'target', accountId: 'l1', providerModel: 'gpt-oss' },
      { kind: 'target', accountId: 'gone', providerModel: 'claude-opus-5' },
    ]);
  });

  test('a real model arriving while the account list still stands writes nothing', () => {
    const { world, record } = worldWhereWritesHang(gateway, { picker: accountDropped });

    pickerStanding(world, modelsOffered).onPickProviderModel('claude-opus-5');

    expect(record.written).toEqual([]);
  });
});

describe('the way back out of a stage', () => {
  test('the kind ask offers no way back, because it is the first thing anything asks', () => {
    const { world } = worldWhereWritesHang(gateway, { picker: kindDropped });

    expect(pickerStanding(world, modelsOffered).onStepBack).toBeUndefined();
  });

  test('an account list opened on a stored card offers none, since nothing asked the kind', () => {
    const { world } = worldWhereWritesHang(gateway, { picker: accountAnchored });

    expect(pickerStanding(world, modelsOffered).onStepBack).toBeUndefined();
  });

  test('an account list a drop opened steps back to the kind ask behind it', () => {
    const { world, record } = worldWhereWritesHang(gateway, { picker: accountDropped });

    pickerStanding(world, modelsOffered).onStepBack?.();

    expect(record.pickers).toEqual([
      { step: 'kind', from: 'draft', at: droppedAt, origin: 'drop' },
    ]);
  });

  test('a model list a drop opened steps back to the account list, holding the drop point', () => {
    const { world, record } = worldWhereWritesHang(gateway, { picker: modelDropped });

    pickerStanding(world, modelsOffered).onStepBack?.();

    expect(record.pickers).toEqual([
      { step: 'account', from: 'draft', at: droppedAt, origin: 'drop' },
    ]);
  });

  test('a model list opened on a stored card steps back holding the child it would replace', () => {
    const { world, record } = worldWhereWritesHang(gateway, { picker: modelAnchored });

    pickerStanding(world, modelsOffered).onStepBack?.();

    expect(record.pickers).toEqual([
      { step: 'account', from: 'route:pooled', anchor: 'target:pooled:t1', replacing: 't1' },
    ]);
  });
});

describe('putting the picker away', () => {
  test('a dismissal takes the standing off the canvas and writes nothing', () => {
    const { world, record } = worldWhereWritesHang(gateway, { picker: modelDropped });

    pickerStanding(world, modelsOffered).onDismiss();

    expect(record.pickers).toEqual([undefined]);
    expect(record.written).toEqual([]);
  });
});
