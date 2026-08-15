import type { GatewayConfig } from '@recompose/contracts';

import { beforeEach, describe, expect, test } from 'vitest';

import { closeInspector, inspectorOpen, toggleInspector } from '../../../../shared/lib';
import { heldDraft } from '../../lib/use-held-draft';
import { releasedWithNothingSelected, releasedWithTheDraftSelected } from './binding-acts';
import { gateway } from './canvas-wiring.testkit';
import {
  canvasEnvironment,
  canvasLeftClean,
  worldWhereWritesAreRefused,
  worldWhereWritesLand,
} from './canvas-world.testkit';

const SLUG = 'my-gateway';

const CARD_SEAT = { 'model:fast': { x: 320, y: 300 } };

function definitionsIn(written: GatewayConfig | undefined): string[] {
  return (written?.virtualModels ?? []).map((model) => model.id);
}

beforeEach(() => {
  canvasEnvironment();
  canvasLeftClean(SLUG);
  closeInspector();
});

describe('what a released binding takes out of the gateway', () => {
  test('the gateway no longer holds the definition', () => {
    const { world, record } = worldWhereWritesLand(gateway);

    releasedWithTheDraftSelected(world, 'fast');

    expect(definitionsIn(record.written[0])).toEqual(['creative', 'slow', 'pooled']);
  });

  test('a release naming a definition the gateway no longer holds writes nothing', () => {
    const { world, record } = worldWhereWritesLand(gateway);

    releasedWithTheDraftSelected(world, 'absent');

    expect(record.written).toEqual([]);
  });
});

describe('the draft a released binding stands back', () => {
  test('it stands at the seat the released card held', () => {
    const { world } = worldWhereWritesLand(gateway, { seats: CARD_SEAT });

    releasedWithTheDraftSelected(world, 'fast');

    expect(heldDraft(SLUG)).toEqual({
      definition: { displayName: 'Fast', id: 'fast', accountId: '', providerModel: '' },
      seat: { x: 320, y: 300 },
    });
  });

  test('a release of a card nobody ever moved stands the draft at the front of the canvas', () => {
    const { world } = worldWhereWritesLand(gateway);

    releasedWithTheDraftSelected(world, 'fast');

    expect(heldDraft(SLUG)?.seat).toEqual({ x: 0, y: 0 });
  });

  test('the draft stands either way out, because the work a person typed survives', () => {
    const { world } = worldWhereWritesLand(gateway, { seats: CARD_SEAT });

    releasedWithNothingSelected(world, 'fast');

    expect(heldDraft(SLUG)?.definition.displayName).toBe('Fast');
  });
});

describe('what a release leaves a person looking at', () => {
  test('a cut cable keeps them on the draft, with the inspector still speaking for it', () => {
    toggleInspector();

    const { world, record } = worldWhereWritesLand(gateway);

    releasedWithTheDraftSelected(world, 'fast');

    expect(record.selected).toEqual(['draft']);
    expect(inspectorOpen()).toBe(true);
  });

  test('a release that took the card away leaves nothing selected', () => {
    const { world, record } = worldWhereWritesLand(gateway);

    releasedWithNothingSelected(world, 'fast');

    expect(record.selected).toEqual([undefined]);
  });

  test('a release that took the card away puts the inspector away with it', () => {
    toggleInspector();

    const { world } = worldWhereWritesLand(gateway);

    releasedWithNothingSelected(world, 'fast');

    expect(inspectorOpen()).toBe(false);
  });
});

describe('what a release says out loud', () => {
  test('the live region says the binding was released', () => {
    const { world, record } = worldWhereWritesLand(gateway);

    releasedWithTheDraftSelected(world, 'fast');

    expect(record.announced).toEqual([{ kind: 'released', virtualModel: 'Fast' }]);
  });

  test('a refused release says why and stands no draft in the definition place', () => {
    const refusal = new Error('recompose cannot find this gateway anymore.');
    const { world, record } = worldWhereWritesAreRefused(gateway, refusal);

    releasedWithTheDraftSelected(world, 'fast');

    expect(record.refused).toEqual([refusal]);
    expect(heldDraft(SLUG)).toBeUndefined();
  });
});
