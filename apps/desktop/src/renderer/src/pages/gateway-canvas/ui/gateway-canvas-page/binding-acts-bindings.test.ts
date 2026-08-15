import type { Account, GatewayConfig, RouteTarget } from '@recompose/contracts';

import { targetTheEntryNames } from '@recompose/contracts';
import { beforeEach, describe, expect, test } from 'vitest';

import type { XY } from '../../lib/canvas-positions';
import type { SettledDefinition } from '../../lib/model-draft';
import type { PickerStanding } from './canvas-standings';

import { closeInspector } from '../../../../shared/lib';
import { completedDraftPick, completedRebindPick } from './binding-acts';
import { gateway } from './canvas-wiring.testkit';
import {
  canvasEnvironment,
  canvasLeftClean,
  draftHeld,
  worldWhereWritesHang,
  worldWhereWritesLand,
} from './canvas-world.testkit';

const SLUG = 'my-gateway';

const DRAFT_SEAT: XY = { x: 40, y: 60 };

const STEADY_DRAFT: SettledDefinition = {
  displayName: 'Steady',
  id: 'steady',
  accountId: '',
  providerModel: '',
};

const workKey: Account = {
  id: 'k1',
  provider: 'anthropic',
  kind: 'api-key',
  label: 'work',
  credentialRef: 'c1',
};

const localRuntime: Account = {
  id: 'l1',
  provider: 'ollama',
  kind: 'local',
  address: 'http://127.0.0.1:11434',
};

function askAnchoredTo(from: string, accountId: string, anchor: string): PickerStanding {
  return { step: 'provider-model', from, accountId, anchor };
}

function bindingIn(written: GatewayConfig | undefined, modelId: string): RouteTarget | undefined {
  const model = written?.virtualModels.find((held) => held.id === modelId);

  return model === undefined ? undefined : targetTheEntryNames(model.routing);
}

beforeEach(() => {
  canvasEnvironment();
  canvasLeftClean(SLUG);
  closeInspector();
});

describe('a draft pick answered with an account and a real model', () => {
  test('the whole definition is committed in one write', () => {
    draftHeld(SLUG, STEADY_DRAFT, DRAFT_SEAT);

    const { world, record } = worldWhereWritesHang(gateway, { accounts: [workKey] });

    completedDraftPick(world, 'k1', 'claude-haiku-4-5');

    expect(record.written[0]?.virtualModels.at(-1)).toMatchObject({
      id: 'steady',
      displayName: 'Steady',
    });
    expect(bindingIn(record.written[0], 'steady')).toEqual({
      kind: 'target',
      accountId: 'k1',
      providerModel: 'claude-haiku-4-5',
    });
  });

  test('the announced target is the name the picked account reads as', () => {
    draftHeld(SLUG, STEADY_DRAFT, DRAFT_SEAT);

    const { world, record } = worldWhereWritesLand(gateway, { accounts: [workKey] });

    completedDraftPick(world, 'k1', 'claude-haiku-4-5');

    expect(record.announced).toEqual([{ kind: 'bound', virtualModel: 'Steady', target: 'work' }]);
  });

  test('a pick answered after the draft went away still writes one whole definition', () => {
    const { world, record } = worldWhereWritesHang(gateway, { accounts: [workKey] });

    completedDraftPick(world, 'k1', 'claude-haiku-4-5');

    expect(bindingIn(record.written[0], '')).toEqual({
      kind: 'target',
      accountId: 'k1',
      providerModel: 'claude-haiku-4-5',
    });
  });
});

describe('a rebind pick with nothing to aim', () => {
  test('a pick with no binding ask standing writes nothing', () => {
    const { world, record } = worldWhereWritesHang(gateway, { accounts: [workKey] });

    completedRebindPick(world, 'l1', 'llama3.2');

    expect(record.written).toEqual([]);
  });

  test('a pick naming a definition the gateway no longer holds writes nothing', () => {
    const { world, record } = worldWhereWritesHang(gateway, {
      accounts: [workKey],
      picker: askAnchoredTo('model:absent', 'l1', 'target:absent'),
    });

    completedRebindPick(world, 'l1', 'llama3.2');

    expect(record.written).toEqual([]);
  });
});

describe('a rebind pick answered with an account and a real model', () => {
  test('the definition it names reaches the picked target instead of the old one', () => {
    const { world, record } = worldWhereWritesHang(gateway, {
      accounts: [workKey, localRuntime],
      picker: askAnchoredTo('model:fast', 'l1', 'target:fast'),
    });

    completedRebindPick(world, 'l1', 'llama3.2');

    expect(bindingIn(record.written[0], 'fast')).toEqual({
      kind: 'target',
      accountId: 'l1',
      providerModel: 'llama3.2',
    });
  });

  test('a binding whose account still stands reads as rebound', () => {
    const { world, record } = worldWhereWritesLand(gateway, {
      accounts: [workKey, localRuntime],
      picker: askAnchoredTo('model:fast', 'l1', 'target:fast'),
    });

    completedRebindPick(world, 'l1', 'llama3.2');

    expect(record.announced).toEqual([{ kind: 'rebound', virtualModel: 'Fast', target: 'Ollama' }]);
  });

  test('a binding whose account had left reads as repaired', () => {
    const { world, record } = worldWhereWritesLand(gateway, {
      accounts: [workKey, localRuntime],
      picker: askAnchoredTo('model:slow', 'k1', 'target:slow'),
    });

    completedRebindPick(world, 'k1', 'claude-opus-5');

    expect(record.announced).toEqual([{ kind: 'repaired', virtualModel: 'Slow', target: 'work' }]);
  });
});
