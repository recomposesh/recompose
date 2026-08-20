import { expect, test } from 'vitest';

import type { XY } from './canvas-positions';
import type { CanvasNode } from './node-graph';

import {
  CARD_MEASURE,
  SATELLITE_MEASURE,
  SATELLITE_SHOULDER,
  satellitesFollowTheirRouters,
  tidyPositions,
} from './tidy-layout';
import { canvasOf, judgeAdvising, nodeOfKind, oneRouterDeep, seatAt } from './tidy-layout.testkit';

const LADDER = 'route:fast';

function judgedCanvas(): readonly CanvasNode[] {
  return [
    nodeOfKind.gateway('gateway'),
    nodeOfKind['virtual-model']('model:fast'),
    nodeOfKind.router(LADDER),
    judgeAdvising('judge:fast:advisor', LADDER),
    oneRouterDeep('target:fast:first', 1),
    oneRouterDeep('target:fast:second', 1),
  ];
}

function boxOf(seat: XY, measure: { width: number; height: number }) {
  return {
    left: seat.x,
    right: seat.x + measure.width,
    top: seat.y,
    bottom: seat.y + measure.height,
  };
}

function overlaps(one: ReturnType<typeof boxOf>, other: ReturnType<typeof boxOf>): boolean {
  return (
    one.left < other.right &&
    other.left < one.right &&
    one.top < other.bottom &&
    other.top < one.bottom
  );
}

function centreAcross(seat: XY, measure: { width: number; height: number }): number {
  return seat.x + measure.width / 2;
}

test('a satellite seats centered over its router rather than drifting off to one side', () => {
  const seats = tidyPositions(judgedCanvas());
  const judge = seatAt(seats, 'judge:fast:advisor');
  const router = seatAt(seats, LADDER);

  expect(centreAcross(judge, SATELLITE_MEASURE)).toBe(centreAcross(router, CARD_MEASURE));
});

test("a satellite seats clear above its router's top edge, never over the card itself", () => {
  const seats = tidyPositions(judgedCanvas());
  const judge = seatAt(seats, 'judge:fast:advisor');
  const router = seatAt(seats, LADDER);

  expect(judge.y + SATELLITE_MEASURE.height).toBeLessThan(router.y);
});

/**
 * The tie is the only thing saying a judge advises rather than answers, and it says it by being
 * dashed. A gap of a few pixels draws one dash, which reads as a join rather than as a broken line,
 * so the clearance has to leave room for the rhythm to repeat.
 */
test('the tie between a judge and its router has the length to read as a dotted line', () => {
  const seats = tidyPositions(judgedCanvas());
  const judge = seatAt(seats, 'judge:fast:advisor');
  const router = seatAt(seats, LADDER);

  expect(router.y - (judge.y + SATELLITE_MEASURE.height)).toBeGreaterThanOrEqual(24);
});

test('a satellite takes no row from the column its router stands in', () => {
  const withJudge = tidyPositions(judgedCanvas());
  const withoutJudge = tidyPositions(judgedCanvas().filter((node) => node.kind !== 'judge'));

  expect(seatAt(withJudge, 'target:fast:first')).toEqual(seatAt(withoutJudge, 'target:fast:first'));
  expect(seatAt(withJudge, LADDER)).toEqual(seatAt(withoutJudge, LADDER));
});

test('a satellite clears every card around it, so no advisor sits on top of a row', () => {
  const nodes = [
    ...canvasOf(['gateway', 'virtual-model', 'virtual-model', 'target']),
    nodeOfKind.router(LADDER),
    judgeAdvising('judge:fast:advisor', LADDER),
  ];
  const seats = tidyPositions(nodes);
  const judge = boxOf(seatAt(seats, 'judge:fast:advisor'), SATELLITE_MEASURE);
  const crowded = nodes
    .filter((node) => node.kind !== 'judge')
    .filter((node) => overlaps(judge, boxOf(seatAt(seats, node.id), CARD_MEASURE)));

  expect(crowded).toEqual([]);
});

test('a satellite follows the router a person dragged, so the tie never stretches away', () => {
  const dragged = { ...tidyPositions(judgedCanvas()), [LADDER]: { x: 900, y: 700 } };
  const seats = satellitesFollowTheirRouters(judgedCanvas(), dragged);

  expect(seatAt(seats, 'judge:fast:advisor')).toEqual({
    x: 900 + SATELLITE_SHOULDER.x,
    y: 700 + SATELLITE_SHOULDER.y,
  });
});

test('a satellite whose router the canvas never stood seats nowhere at all', () => {
  const orphan = [judgeAdvising('judge:fast:advisor', 'route:gone')];

  expect(tidyPositions(orphan)).toEqual({});
});
