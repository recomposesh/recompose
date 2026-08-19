import { describe, expect, test } from 'vitest';

import type { NodePositions } from './canvas-positions';
import type { CanvasNode } from './node-graph';

import {
  satelliteOffset,
  satelliteOffsetKey,
  satellitesFollowTheirRouters,
  SATELLITE_SHOULDER,
  tidyPositions,
} from './tidy-layout';
import { judgeAdvising, nodeOfKind, oneRouterDeep, seatAt } from './tidy-layout.testkit';

const LADDER = 'route:fast';

const ADVISOR = 'judge:fast:advisor';

const MOVED = { x: 60, y: 140 };

function judgedCanvas(): readonly CanvasNode[] {
  return [
    nodeOfKind.gateway('gateway'),
    nodeOfKind['virtual-model']('model:fast'),
    nodeOfKind.router(LADDER),
    judgeAdvising(ADVISOR, LADDER),
    oneRouterDeep('target:fast:first', 1),
  ];
}

function movedTo(offset: { x: number; y: number }): NodePositions {
  return { [satelliteOffsetKey(ADVISOR)]: offset };
}

describe('a judge satellite a person set down somewhere of their own', () => {
  test('stands where they left it, measured from the router it advises', () => {
    const seats = satellitesFollowTheirRouters(
      judgedCanvas(),
      { [LADDER]: { x: 400, y: 300 } },
      movedTo(MOVED),
    );

    expect(seatAt(seats, ADVISOR)).toEqual({ x: 460, y: 440 });
  });

  test('travels with its router, so the tie never stretches away', () => {
    const seats = satellitesFollowTheirRouters(
      judgedCanvas(),
      { [LADDER]: { x: 900, y: 700 } },
      movedTo(MOVED),
    );

    expect(seatAt(seats, ADVISOR)).toEqual({ x: 960, y: 840 });
  });

  test('takes the shoulder seat again once the arrangement forgets the move', () => {
    const seats = satellitesFollowTheirRouters(judgedCanvas(), { [LADDER]: { x: 400, y: 300 } });

    expect(seatAt(seats, ADVISOR)).toEqual({
      x: 400 + SATELLITE_SHOULDER.x,
      y: 300 + SATELLITE_SHOULDER.y,
    });
  });

  test('the tidy arrangement reads no move at all, so tidy returns it to the shoulder', () => {
    const tidy = tidyPositions(judgedCanvas());
    const router = seatAt(tidy, LADDER);

    expect(seatAt(tidy, ADVISOR)).toEqual({
      x: router.x + SATELLITE_SHOULDER.x,
      y: router.y + SATELLITE_SHOULDER.y,
    });
  });
});

describe('the offset one satellite is remembered by', () => {
  test('is what the drag left between the router and where the satellite came to rest', () => {
    expect(satelliteOffset({ x: 400, y: 300 }, { x: 460, y: 440 })).toEqual(MOVED);
  });

  test('names the satellite apart from every card seat the arrangement holds', () => {
    expect(satelliteOffsetKey(ADVISOR)).not.toBe(ADVISOR);
  });
});
