import { beforeEach, describe, expect, test } from 'vitest';

import { heldDraft } from '../../lib/use-held-draft';
import { gateway } from './canvas-wiring.testkit';
import {
  canvasEnvironment,
  canvasLeftClean,
  draftHeld,
  worldWhereWritesHang,
} from './canvas-world.testkit';
import { removalAsked } from './removal-flow';
import { gatewayNobodyNamed, nothingDeleted } from './removal-flow.testkit';

beforeEach(() => {
  canvasEnvironment();
  canvasLeftClean('my-gateway');
});

describe('the removal question the canvas stands on', () => {
  test('a canvas nobody asked to remove anything stands on no question at all', () => {
    const { world } = worldWhereWritesHang(gateway);

    expect(removalAsked(world, nothingDeleted)).toBeUndefined();
  });
});

describe('the question the gateway asks about itself', () => {
  test('the gateway asks by the name a person gave it', () => {
    const { world } = worldWhereWritesHang(gateway, { removing: 'gateway' });

    expect(removalAsked(world, nothingDeleted)).toMatchObject({
      kind: 'gateway',
      name: 'My Gateway',
    });
  });

  test('a gateway nobody named asks by the name clients send it', () => {
    const { world } = worldWhereWritesHang(gatewayNobodyNamed(), { removing: 'gateway' });

    expect(removalAsked(world, nothingDeleted)).toMatchObject({
      kind: 'gateway',
      name: 'my-gateway',
    });
  });
});

describe('answering the question the gateway asks about itself', () => {
  test('confirming runs the deletion it named', () => {
    const { world } = worldWhereWritesHang(gateway, { removing: 'gateway' });
    const taken: string[] = [];

    removalAsked(world, () => {
      taken.push('my-gateway');
    })?.onConfirm();

    expect(taken).toEqual(['my-gateway']);
  });

  test('confirming puts the ask away behind it', () => {
    const { world, record } = worldWhereWritesHang(gateway, { removing: 'gateway' });

    removalAsked(world, nothingDeleted)?.onConfirm();

    expect(record.asked).toEqual([undefined]);
  });

  test('declining leaves the gateway standing and still puts the ask away', () => {
    const { world, record } = worldWhereWritesHang(gateway, { removing: 'gateway' });
    const taken: string[] = [];

    removalAsked(world, () => {
      taken.push('my-gateway');
    })?.onCancel();

    expect(taken).toEqual([]);
    expect(record.asked).toEqual([undefined]);
  });
});

describe('the question a definition card asks', () => {
  test('a stored definition asks by the name a person gave it', () => {
    const { world } = worldWhereWritesHang(gateway, { removing: 'model:fast' });

    expect(removalAsked(world, nothingDeleted)).toMatchObject({
      kind: 'virtual-model',
      name: 'Fast',
    });
  });

  test('a card naming a definition the gateway no longer holds asks by the id on the card', () => {
    const { world } = worldWhereWritesHang(gateway, { removing: 'model:absent' });

    expect(removalAsked(world, nothingDeleted)).toMatchObject({
      kind: 'virtual-model',
      name: 'model:absent',
    });
  });
});

describe('the question the held draft asks', () => {
  test('the held draft asks by the name the person typed on it', () => {
    draftHeld('my-gateway', {
      displayName: 'Steady',
      id: 'steady',
      accountId: '',
      providerModel: '',
    });

    const { world } = worldWhereWritesHang(gateway, { removing: 'draft' });

    expect(removalAsked(world, nothingDeleted)).toMatchObject({
      kind: 'virtual-model',
      name: 'Steady',
    });
  });

  test('a draft question with no draft standing asks about a definition saying nothing', () => {
    const { world } = worldWhereWritesHang(gateway, { removing: 'draft' });

    expect(removalAsked(world, nothingDeleted)).toMatchObject({
      kind: 'virtual-model',
      name: '',
    });
  });

  test('a draft nobody named asks by the id clients would send it', () => {
    draftHeld('my-gateway', {
      displayName: '',
      id: 'steady',
      accountId: '',
      providerModel: '',
    });

    const { world } = worldWhereWritesHang(gateway, { removing: 'draft' });

    expect(removalAsked(world, nothingDeleted)).toMatchObject({
      kind: 'virtual-model',
      name: 'steady',
    });
  });
});

describe('a card standing for a route node the gateway cannot find', () => {
  test('a route node card naming no stored definition asks about a definition, never nothing', () => {
    const { world } = worldWhereWritesHang(gateway, { removing: 'target:absent' });

    expect(removalAsked(world, nothingDeleted)).toMatchObject({
      kind: 'virtual-model',
      name: 'target:absent',
    });
  });

  test('a card standing where the routing holds no node asks about a definition instead', () => {
    const { world } = worldWhereWritesHang(gateway, { removing: 'target:pooled:nowhere' });

    expect(removalAsked(world, nothingDeleted)).toMatchObject({
      kind: 'virtual-model',
      name: 'target:pooled:nowhere',
    });
  });
});

describe('answering the question a definition card asks', () => {
  test('confirming takes that definition off the gateway', () => {
    const { world, record } = worldWhereWritesHang(gateway, { removing: 'model:fast' });

    removalAsked(world, nothingDeleted)?.onConfirm();

    expect(record.written[0]?.virtualModels.map((held) => held.id)).toEqual([
      'creative',
      'slow',
      'pooled',
    ]);
  });

  test('confirming the draft question leaves no draft standing behind it', () => {
    draftHeld('my-gateway', {
      displayName: 'Steady',
      id: 'steady',
      accountId: '',
      providerModel: '',
    });

    const { world } = worldWhereWritesHang(gateway, { removing: 'draft' });

    removalAsked(world, nothingDeleted)?.onConfirm();

    expect(heldDraft('my-gateway')).toBeUndefined();
  });

  test('confirming puts the ask away behind it', () => {
    const { world, record } = worldWhereWritesHang(gateway, { removing: 'model:fast' });

    removalAsked(world, nothingDeleted)?.onConfirm();

    expect(record.asked).toEqual([undefined]);
  });

  test('declining writes nothing and still puts the ask away', () => {
    const { world, record } = worldWhereWritesHang(gateway, { removing: 'model:fast' });

    removalAsked(world, nothingDeleted)?.onCancel();

    expect(record.written).toEqual([]);
    expect(record.asked).toEqual([undefined]);
  });
});
