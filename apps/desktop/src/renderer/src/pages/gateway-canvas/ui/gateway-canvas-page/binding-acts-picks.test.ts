import type { Account } from '@recompose/contracts';

import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { XY } from '../../lib/canvas-positions';
import type { CanvasGraph } from '../../lib/node-graph';
import type { PickerStanding } from './canvas-standings';

import { closeInspector } from '../../../../shared/lib';
import { canvasPositions } from '../../lib/canvas-position-store';
import { committedPick } from './binding-acts';
import { gateway } from './canvas-wiring.testkit';
import {
  canvasEnvironment,
  canvasLeftClean,
  worldWhereWritesAreRefused,
  worldWhereWritesLand,
} from './canvas-world.testkit';

const SLUG = 'my-gateway';

const LET_GO_AT: XY = { x: 640, y: 150 };

const workKey: Account = {
  id: 'k1',
  provider: 'anthropic',
  kind: 'api-key',
  label: 'work',
  credentialRef: 'c1',
};

const boundAccountAlreadyOnTheCanvas: CanvasGraph = {
  nodes: [
    {
      id: 'target:fast',
      kind: 'target',
      account: workKey,
      modelId: 'fast',
      providerModel: 'claude-sonnet-5',
      routeNodeId: 'node-fast',
      depth: 0,
    },
  ],
  edges: [],
};

function askDroppedAt(from: string, at: XY): PickerStanding {
  return { step: 'provider-model', from, accountId: 'k1', at, origin: 'drop' };
}

function askOpenedFrom(from: string, at: XY): PickerStanding {
  return { step: 'provider-model', from, accountId: 'k1', at, origin: 'ask' };
}

function askAnchoredTo(from: string, anchor: string): PickerStanding {
  return { step: 'provider-model', from, accountId: 'k1', anchor };
}

function looksAtBornCards(): (() => void)[] {
  const looks: (() => void)[] = [];

  vi.stubGlobal('requestAnimationFrame', (look: () => void) => {
    looks.push(look);

    return 0;
  });

  return looks;
}

beforeEach(() => {
  canvasEnvironment();
  canvasLeftClean(SLUG);
  closeInspector();
});

describe('a completed pick whose write lands', () => {
  test('the binding ask goes away', () => {
    const { world, record } = worldWhereWritesLand(gateway, {
      picker: askOpenedFrom('draft', LET_GO_AT),
    });

    committedPick(world, 'target:steady', gateway, () => {});

    expect(record.pickers).toEqual([undefined]);
  });

  test('a target born where the cable was let go stands exactly there', () => {
    const { world } = worldWhereWritesLand(gateway, {
      picker: askDroppedAt('draft', LET_GO_AT),
    });

    committedPick(world, 'target:steady', gateway, () => {});

    expect(canvasPositions(SLUG)['target:steady']).toEqual(LET_GO_AT);
  });
});

describe('the cards a completed pick leaves exactly where they stand', () => {
  test('an account already standing on the canvas keeps the seat a person gave it', () => {
    const { world } = worldWhereWritesLand(gateway, {
      picker: askDroppedAt('model:creative', LET_GO_AT),
      graph: boundAccountAlreadyOnTheCanvas,
    });

    committedPick(world, 'target:fast', gateway, () => {});

    expect(canvasPositions(SLUG)).toStrictEqual({});
  });

  test('an ask answered on a card rather than by a drop names no spot at all', () => {
    const { world } = worldWhereWritesLand(gateway, {
      picker: askAnchoredTo('route:pooled', 'target:pooled:t1'),
    });

    committedPick(world, 'target:steady', gateway, () => {});

    expect(canvasPositions(SLUG)).toStrictEqual({});
  });
});

describe('the look the canvas takes at a card it just made', () => {
  test('a card born where the pointer let it go is already in view, so nothing moves', () => {
    const looks = looksAtBornCards();
    const { world } = worldWhereWritesLand(gateway, {
      picker: askDroppedAt('draft', LET_GO_AT),
    });

    committedPick(world, 'target:steady', gateway, () => {});

    expect(looks).toHaveLength(0);
  });

  test('a card born from a keyboard ask is looked at, since its seat can stand past the pane', () => {
    const looks = looksAtBornCards();
    const { world } = worldWhereWritesLand(gateway, {
      picker: askOpenedFrom('draft', LET_GO_AT),
    });

    committedPick(world, 'target:steady', gateway, () => {});

    expect(looks).toHaveLength(1);
  });

  test('a card born under an ask anchored to a standing card is looked at as well', () => {
    const looks = looksAtBornCards();
    const { world } = worldWhereWritesLand(gateway, {
      picker: askAnchoredTo('route:pooled', 'target:pooled:t1'),
    });

    committedPick(world, 'target:steady', gateway, () => {});

    expect(looks).toHaveLength(1);
  });
});

describe('the cards the canvas never goes looking for', () => {
  test('a pick answered with no binding ask standing moves the view not at all', () => {
    const looks = looksAtBornCards();
    const { world } = worldWhereWritesLand(gateway);

    committedPick(world, 'target:steady', gateway, () => {});

    expect(looks).toHaveLength(0);
  });

  test('a card that already stands on the canvas is one a person can see', () => {
    const looks = looksAtBornCards();
    const { world } = worldWhereWritesLand(gateway, {
      picker: askOpenedFrom('model:creative', LET_GO_AT),
      graph: boundAccountAlreadyOnTheCanvas,
    });

    committedPick(world, 'target:fast', gateway, () => {});

    expect(looks).toHaveLength(0);
  });
});

describe('a completed pick whose write is refused', () => {
  test('the binding ask goes away', () => {
    const refusal = new Error('This gateway already serves a virtual model named "steady".');
    const { world, record } = worldWhereWritesAreRefused(gateway, refusal, {
      picker: askOpenedFrom('draft', LET_GO_AT),
    });

    committedPick(world, 'target:steady', gateway, () => {});

    expect(record.pickers).toEqual([undefined]);
  });

  test('the refusal is said out loud', () => {
    const refusal = new Error('This gateway already serves a virtual model named "steady".');
    const { world, record } = worldWhereWritesAreRefused(gateway, refusal, {
      picker: askOpenedFrom('draft', LET_GO_AT),
    });

    committedPick(world, 'target:steady', gateway, () => {});

    expect(record.refused).toEqual([refusal]);
  });
});
