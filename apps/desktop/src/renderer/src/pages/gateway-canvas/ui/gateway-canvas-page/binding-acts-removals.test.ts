import type { GatewayConfig } from '@recompose/contracts';

import { beforeEach, describe, expect, test } from 'vitest';

import type { XY } from '../../lib/canvas-positions';
import type { SettledDefinition } from '../../lib/model-draft';

import { closeInspector, inspectorOpen, toggleInspector } from '../../../../shared/lib';
import { heldDraft } from '../../lib/use-held-draft';
import { askedTargetRemoval, removedDefinition } from './binding-acts';
import { gateway } from './canvas-wiring.testkit';
import {
  canvasEnvironment,
  canvasLeftClean,
  draftHeld,
  worldWhereWritesAreRefused,
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

function definitionsIn(written: GatewayConfig | undefined): string[] {
  return (written?.virtualModels ?? []).map((model) => model.id);
}

beforeEach(() => {
  canvasEnvironment();
  canvasLeftClean(SLUG);
  closeInspector();
});

describe('a Delete press on a target card', () => {
  test('a card naming a stored definition asks the removal question', () => {
    const { world, record } = worldWhereWritesHang(gateway);

    askedTargetRemoval(world, 'target:fast');

    expect(record.asked).toEqual(['target:fast']);
  });

  test('a card naming a definition the gateway no longer holds asks nothing', () => {
    const { world, record } = worldWhereWritesHang(gateway);

    askedTargetRemoval(world, 'target:absent');

    expect(record.asked).toEqual([]);
  });

  test('a card standing for no binding at all asks nothing', () => {
    const { world, record } = worldWhereWritesHang(gateway);

    askedTargetRemoval(world, 'model:fast');

    expect(record.asked).toEqual([]);
  });
});

describe('a removal a person confirmed on the held draft', () => {
  test('the draft goes away and nothing at all is stored', () => {
    draftHeld(SLUG, STEADY_DRAFT, DRAFT_SEAT);

    const { world, record } = worldWhereWritesLand(gateway);

    removedDefinition(world, 'draft');

    expect(heldDraft(SLUG)).toBeUndefined();
    expect(record.written).toEqual([]);
  });

  test('nothing stands selected and the inspector goes away with it', () => {
    draftHeld(SLUG, STEADY_DRAFT, DRAFT_SEAT);
    toggleInspector();

    const { world, record } = worldWhereWritesLand(gateway);

    removedDefinition(world, 'draft');

    expect(record.selected).toEqual([undefined]);
    expect(inspectorOpen()).toBe(false);
  });
});

describe('a removal a person confirmed on a stored definition', () => {
  test('the definition leaves the gateway', () => {
    const { world, record } = worldWhereWritesLand(gateway);

    removedDefinition(world, 'model:fast');

    expect(definitionsIn(record.written[0])).toEqual(['creative', 'slow', 'pooled']);
  });

  test('a landed removal leaves nothing selected and puts the inspector away', () => {
    toggleInspector();

    const { world, record } = worldWhereWritesLand(gateway);

    removedDefinition(world, 'model:fast');

    expect(record.selected).toEqual([undefined]);
    expect(inspectorOpen()).toBe(false);
  });
});

describe('a removal that stores nothing', () => {
  test('a card naming no virtual model at all writes nothing', () => {
    const { world, record } = worldWhereWritesLand(gateway);

    removedDefinition(world, 'target:fast');

    expect(record.written).toEqual([]);
  });

  test('a refused removal says why', () => {
    const refusal = new Error('recompose cannot find this gateway anymore.');
    const { world, record } = worldWhereWritesAreRefused(gateway, refusal);

    removedDefinition(world, 'model:fast');

    expect(record.refused).toEqual([refusal]);
  });
});
