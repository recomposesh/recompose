import { beforeEach, describe, expect, test } from 'vitest';

import { gateway } from './canvas-wiring.testkit';
import { canvasEnvironment, canvasLeftClean, worldWhereWritesHang } from './canvas-world.testkit';
import { removalAsked } from './removal-flow';
import {
  gatewayHoldingALadderBelowTheEntry,
  gatewayWhoseLadderIsNamed,
  nothingDeleted,
  stored,
} from './removal-flow.testkit';

beforeEach(() => {
  canvasEnvironment();
  canvasLeftClean('my-gateway');
});

describe('the question a card standing for the entry asks', () => {
  test('the entry target asks about the account the definition reaches', () => {
    const { world } = worldWhereWritesHang(gateway, {
      removing: 'target:fast',
      accounts: stored,
    });

    expect(removalAsked(world, nothingDeleted)).toMatchObject({
      kind: 'target',
      name: 'work',
    });
  });

  test('an entry target whose account left the registry asks by the bare account id', () => {
    const { world } = worldWhereWritesHang(gateway, {
      removing: 'target:slow',
      accounts: stored,
    });

    expect(removalAsked(world, nothingDeleted)).toMatchObject({
      kind: 'target',
      name: 'gone',
    });
  });

  test('the entry router asks about the ladder, named by how it chooses', () => {
    const { world } = worldWhereWritesHang(gateway, { removing: 'route:pooled' });

    expect(removalAsked(world, nothingDeleted)).toMatchObject({
      kind: 'router',
      name: 'Failover',
    });
  });

  test('a ladder a person named asks by that name rather than by how it chooses', () => {
    const { world } = worldWhereWritesHang(gatewayWhoseLadderIsNamed(), {
      removing: 'route:pooled',
    });

    expect(removalAsked(world, nothingDeleted)).toMatchObject({
      kind: 'router',
      name: 'Ladder',
    });
  });
});

describe('the question a card standing below the entry asks', () => {
  test('a child target asks about the child rather than about the definition holding it', () => {
    const { world } = worldWhereWritesHang(gateway, {
      removing: 'target:pooled:t1',
      accounts: stored,
    });

    expect(removalAsked(world, nothingDeleted)).toMatchObject({
      kind: 'child-target',
      name: 'work',
    });
  });

  test('a ladder standing below the entry asks as a child of the ladder above it', () => {
    const { world } = worldWhereWritesHang(gatewayHoldingALadderBelowTheEntry(), {
      removing: 'route:nested:r2',
    });

    expect(removalAsked(world, nothingDeleted)).toMatchObject({
      kind: 'child-router',
      name: 'Round-robin',
    });
  });
});

describe('what a confirmed route node removal takes with it', () => {
  test('confirming an entry question takes the whole definition off the gateway', () => {
    const { world, record } = worldWhereWritesHang(gateway, { removing: 'route:pooled' });

    removalAsked(world, nothingDeleted)?.onConfirm();

    expect(record.written[0]?.virtualModels.map((held) => held.id)).toEqual([
      'fast',
      'creative',
      'slow',
    ]);
  });

  test('confirming a child question thins the ladder to what stood beside the child', () => {
    const { world, record } = worldWhereWritesHang(gateway, { removing: 'target:pooled:t1' });

    removalAsked(world, nothingDeleted)?.onConfirm();

    const pooled = record.written[0]?.virtualModels.find((held) => held.id === 'pooled');

    expect(Object.keys(pooled?.routing.nodes ?? {})).toEqual(['r1', 't2']);
  });

  test('a child leaving keeps every definition on the gateway serving', () => {
    const { world, record } = worldWhereWritesHang(gateway, { removing: 'target:pooled:t1' });

    removalAsked(world, nothingDeleted)?.onConfirm();

    expect(record.written[0]?.virtualModels.map((held) => held.id)).toEqual([
      'fast',
      'creative',
      'slow',
      'pooled',
    ]);
  });
});

describe('answering the question a route node card asks', () => {
  test('confirming puts the ask away behind it', () => {
    const { world, record } = worldWhereWritesHang(gateway, { removing: 'target:pooled:t1' });

    removalAsked(world, nothingDeleted)?.onConfirm();

    expect(record.asked).toEqual([undefined]);
  });

  test('declining writes nothing and still puts the ask away', () => {
    const { world, record } = worldWhereWritesHang(gateway, { removing: 'target:pooled:t1' });

    removalAsked(world, nothingDeleted)?.onCancel();

    expect(record.written).toEqual([]);
    expect(record.asked).toEqual([undefined]);
  });
});
