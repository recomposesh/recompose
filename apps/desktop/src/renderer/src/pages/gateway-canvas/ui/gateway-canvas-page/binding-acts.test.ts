import type { Account } from '@recompose/contracts';

import { beforeEach, describe, expect, test } from 'vitest';

import type { XY } from '../../lib/canvas-positions';
import type { SettledDefinition } from '../../lib/model-draft';

import { closeInspector, inspectorOpen, toggleInspector } from '../../../../shared/lib';
import { canvasPositions } from '../../lib/canvas-position-store';
import { heldDraft } from '../../lib/use-held-draft';
import { graduatedDraft, spokenNameOf, targetNameIn } from './binding-acts';
import { gateway } from './canvas-wiring.testkit';
import {
  canvasEnvironment,
  canvasLeftClean,
  draftHeld,
  worldWhereWritesLand,
} from './canvas-world.testkit';

const stored: readonly Account[] = [
  { id: 'k1', provider: 'anthropic', kind: 'api-key', label: 'work', credentialRef: 'c1' },
  { id: 'l1', provider: 'ollama', kind: 'local', address: 'http://127.0.0.1:11434' },
];

describe('the name a definition answers to out loud', () => {
  test('a named definition is spoken by its name', () => {
    expect(spokenNameOf({ displayName: 'Fast', id: 'fast' })).toBe('Fast');
  });

  test('a definition nobody named is spoken by the id clients send it', () => {
    expect(spokenNameOf({ displayName: '', id: 'steady' })).toBe('steady');
  });
});

describe('the name a target account reads as', () => {
  test('a stored account reads as the name a person gave it', () => {
    expect(targetNameIn(stored, 'k1')).toBe('work');
  });

  test('an account with no label of its own reads as what it is', () => {
    expect(targetNameIn(stored, 'l1')).toBe('Ollama');
  });

  test('an account that left the registry reads as its bare id, never as nothing', () => {
    expect(targetNameIn(stored, 'g1')).toBe('g1');
  });
});

const SLUG = 'my-gateway';

const ARRANGEMENT_WRITTEN_DOWN = 'recompose.canvas.positions.my-gateway';

const STEADY = { id: 'steady', displayName: 'Steady' };

const STEADY_DRAFT: SettledDefinition = {
  displayName: 'Steady',
  id: 'steady',
  accountId: '',
  providerModel: '',
};

const DRAFT_SEAT: XY = { x: 40, y: 60 };

beforeEach(() => {
  canvasEnvironment();
  canvasLeftClean(SLUG);
  closeInspector();
});

describe('the card a graduated draft leaves standing', () => {
  test('it stands exactly where the draft stood', () => {
    draftHeld(SLUG, STEADY_DRAFT, DRAFT_SEAT);

    const { world } = worldWhereWritesLand(gateway);

    graduatedDraft(world, STEADY, 'work');

    expect(canvasPositions(SLUG)['model:steady']).toEqual(DRAFT_SEAT);
  });

  test('a binding that brings a second card into being seats it at the same spot', () => {
    draftHeld(SLUG, STEADY_DRAFT, DRAFT_SEAT);

    const { world } = worldWhereWritesLand(gateway);
    const alsoSeated: XY[] = [];

    graduatedDraft(world, STEADY, 'work', (draftSeat) => {
      alsoSeated.push(draftSeat);
    });

    expect(alsoSeated).toEqual([DRAFT_SEAT]);
  });

  test('the arrangement is written down, so the card holds its place next time', () => {
    draftHeld(SLUG, STEADY_DRAFT, DRAFT_SEAT);

    const { world } = worldWhereWritesLand(gateway);

    graduatedDraft(world, STEADY, 'work');

    const kept: unknown = JSON.parse(localStorage.getItem(ARRANGEMENT_WRITTEN_DOWN) ?? 'null');

    expect(kept).toEqual({ 'model:steady': DRAFT_SEAT });
  });
});

describe('what a graduated draft puts away', () => {
  test('the gateway holds the draft no longer', () => {
    draftHeld(SLUG, STEADY_DRAFT, DRAFT_SEAT);

    const { world } = worldWhereWritesLand(gateway);

    graduatedDraft(world, STEADY, 'work');

    expect(heldDraft(SLUG)).toBeUndefined();
  });

  test('nothing stands selected once the draft is gone', () => {
    draftHeld(SLUG, STEADY_DRAFT, DRAFT_SEAT);

    const { world, record } = worldWhereWritesLand(gateway);

    graduatedDraft(world, STEADY, 'work');

    expect(record.selected).toEqual([undefined]);
  });

  test('the inspector closes, because the draft it spoke for is gone', () => {
    draftHeld(SLUG, STEADY_DRAFT, DRAFT_SEAT);
    toggleInspector();

    const { world } = worldWhereWritesLand(gateway);

    graduatedDraft(world, STEADY, 'work');

    expect(inspectorOpen()).toBe(false);
  });
});

describe('what a graduated draft says out loud', () => {
  test('the live region says which target the definition now reaches', () => {
    draftHeld(SLUG, STEADY_DRAFT, DRAFT_SEAT);

    const { world, record } = worldWhereWritesLand(gateway);

    graduatedDraft(world, STEADY, 'work');

    expect(record.announced).toEqual([{ kind: 'bound', virtualModel: 'Steady', target: 'work' }]);
  });

  test('a graduation with no draft standing seats no card and still says what bound', () => {
    const { world, record } = worldWhereWritesLand(gateway);

    graduatedDraft(world, STEADY, 'work');

    expect(canvasPositions(SLUG)).toEqual({});
    expect(record.announced).toEqual([{ kind: 'bound', virtualModel: 'Steady', target: 'work' }]);
  });
});
