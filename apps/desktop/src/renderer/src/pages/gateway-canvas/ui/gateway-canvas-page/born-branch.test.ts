import { beforeEach, describe, expect, test } from 'vitest';

import type { XY } from '../../lib/canvas-positions';
import type { PickerStanding } from './canvas-standings';

import { canvasPositions } from '../../lib/canvas-position-store';
import { canvasGraph } from '../../lib/node-graph';
import { columnStep } from '../../lib/tidy-layout.testkit';
import { branchBeingWorded, leaveWording } from '../../lib/use-branch-wording';
import { pooledGateway } from '../../testing/routed-gateways.testkit';
import { canvasEnvironment, canvasLeftClean, worldWhereWritesLand } from './canvas-world.testkit';
import { completedChildPick } from './ladder-acts';
import { accounts, CANVAS, gatewayOfAJudgedRouter } from './router-acts.testkit';

const LADDER = 'route:judged';

const JUDGED_ADDRESS = { modelId: 'judged', routeNodeId: undefined };

const droppedOnAStoredChild: PickerStanding = {
  step: 'provider-model',
  from: LADDER,
  accountId: 'k1',
  anchor: 'target:judged:c1',
};

function judgedCanvas() {
  return canvasGraph(gatewayOfAJudgedRouter(), accounts, { draft: undefined, pending: undefined });
}

function bornSeats(): readonly XY[] {
  return Object.entries(canvasPositions(CANVAS))
    .filter(([id]) => id.startsWith('target:'))
    .map(([, seat]) => seat);
}

describe('a child born under a router a cable was dropped from', () => {
  beforeEach(() => {
    canvasEnvironment();
    canvasLeftClean(CANVAS);
  });

  test('stands one column beyond the router that took it, never back in the binding column', () => {
    const { world } = worldWhereWritesLand(gatewayOfAJudgedRouter(), {
      graph: judgedCanvas(),
      picker: droppedOnAStoredChild,
      seats: { [LADDER]: { x: 2 * columnStep(), y: 0 } },
    });

    completedChildPick(world, JUDGED_ADDRESS, 'k1', 'claude-opus-5');

    expect(bornSeats().map((seat) => seat.x)).toEqual([3 * columnStep()]);
  });

  test('stands below whatever already stands in that column, rather than on top of it', () => {
    const { world } = worldWhereWritesLand(gatewayOfAJudgedRouter(), {
      graph: judgedCanvas(),
      picker: droppedOnAStoredChild,
      seats: {
        [LADDER]: { x: 2 * columnStep(), y: 0 },
        'target:judged:c1': { x: 3 * columnStep(), y: 300 },
      },
    });

    completedChildPick(world, JUDGED_ADDRESS, 'k1', 'claude-opus-5');

    expect(bornSeats().every((seat) => seat.y > 300)).toBe(true);
  });
});

describe('a branch born under a conditional router', () => {
  beforeEach(() => {
    canvasEnvironment();
    canvasLeftClean(CANVAS);
    leaveWording();
  });

  test('opens its editor at once, so no child ever attaches without a label and a rule', () => {
    const { world } = worldWhereWritesLand(gatewayOfAJudgedRouter(), {
      graph: judgedCanvas(),
      picker: droppedOnAStoredChild,
      seats: { [LADDER]: { x: 2 * columnStep(), y: 0 } },
    });

    completedChildPick(world, JUDGED_ADDRESS, 'k1', 'claude-opus-5');

    expect(branchBeingWorded()).toMatchObject({
      modelId: 'judged',
      routerId: 'r1',
      label: '',
      rule: '',
      routesTo: 'claude-opus-5',
    });
  });

  test('a child joining a router that reads no request opens no editor at all', () => {
    const { world } = worldWhereWritesLand(pooledGateway, {
      graph: { nodes: [], edges: [] },
      picker: {
        step: 'provider-model',
        from: 'route:pooled',
        accountId: 'k1',
        anchor: 'target:pooled:t1',
      },
    });

    completedChildPick(world, { modelId: 'pooled', routeNodeId: undefined }, 'k1', 'gpt-5');

    expect(branchBeingWorded()).toBeUndefined();
  });
});
