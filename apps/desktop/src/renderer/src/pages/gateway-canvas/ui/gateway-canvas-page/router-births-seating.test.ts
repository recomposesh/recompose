import { beforeEach, describe, expect, test } from 'vitest';

import type { PickerStanding } from './canvas-standings';
import type { PickerWalk } from './picker-on-canvas.testkit';

import { canvasPositions } from '../../lib/canvas-position-store';
import { conditionalIn } from '../../lib/conditional-policy';
import { columnStep } from '../../lib/tidy-layout.testkit';
import { gateway } from './canvas-wiring.testkit';
import { canvasEnvironment, canvasLeftClean, draftHeld } from './canvas-world.testkit';
import { droppedAt, routingOf, storedAccounts, walkedFrom } from './picker-on-canvas.testkit';
import { CANVAS } from './router-acts.testkit';

const askedAtTheDraft: PickerStanding = {
  step: 'kind',
  from: 'draft',
  at: droppedAt,
  origin: 'drop',
};

function elseSeatOf(modelId: string, walk: PickerWalk) {
  const routing = routingOf(walk.written[0], modelId);
  const policy = routing === undefined ? undefined : conditionalIn(routing.nodes[routing.entry]);

  if (policy === undefined) {
    throw new Error('This scenario births a conditional router, and none reached the document.');
  }

  return canvasPositions(CANVAS)[`target:${modelId}:${policy.elseChild}`];
}

function walkNamingJudgeAndElse() {
  const walk = walkedFrom(gateway, askedAtTheDraft, storedAccounts);

  walk.answers((asked) => {
    asked.onPickKind('router');
  });
  walk.answers((asked) => {
    asked.onPickRouterMode('conditional');
  });
  walk.answers((asked) => {
    asked.onPickAccount('k1');
  });
  walk.answers((asked) => {
    asked.onPickProviderModel('claude-haiku-4-5');
  });
  walk.answers((asked) => {
    asked.onPickAccount('l1');
  });
  walk.answers((asked) => {
    asked.onPickProviderModel('claude-opus-5');
  });

  return walk;
}

describe('the else branch a conditional router is born holding', () => {
  beforeEach(() => {
    canvasEnvironment();
    canvasLeftClean(CANVAS);
  });

  test('stands one column beyond its router, on the row the router took', () => {
    draftHeld(CANVAS, { displayName: 'Steady', id: 'steady', accountId: '', providerModel: '' });

    const walk = walkNamingJudgeAndElse();

    expect(elseSeatOf('steady', walk)).toEqual({
      x: droppedAt.x + columnStep(),
      y: droppedAt.y,
    });
  });
});
