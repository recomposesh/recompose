import type { NodeChange } from '@xyflow/react';

import { beforeEach, describe, expect, test } from 'vitest';

import type { CanvasGraph } from '../../lib/node-graph';

import { canvasPositions } from '../../lib/canvas-position-store';
import { satelliteOffsetKey, SATELLITE_SHOULDER } from '../../lib/tidy-layout';
import { judgeAdvising, nodeOfKind } from '../../lib/tidy-layout.testkit';
import { appliedSeatMoves } from './arrangement-gestures';
import { seatsOf } from './canvas-standings';
import { flowNodesOf } from './canvas-wiring';
import { gateway } from './canvas-wiring.testkit';
import { canvasEnvironment, canvasLeftClean, worldWhereWritesHang } from './canvas-world.testkit';

const LADDER = 'route:fast';

const ADVISOR = 'judge:fast:advisor';

const ROUTER_SEAT = { x: 400, y: 300 };

const NOTHING_OVERLAID = { draft: undefined, pending: undefined };

function judgedGraph(): CanvasGraph {
  return {
    nodes: [nodeOfKind.router(LADDER), judgeAdvising(ADVISOR, LADDER)],
    edges: [],
  };
}

function letGoAt(at: { x: number; y: number }): NodeChange[] {
  return [{ type: 'position', id: ADVISOR, position: at, dragging: false }];
}

describe('the judge satellite a person drags', () => {
  beforeEach(() => {
    canvasEnvironment();
    canvasLeftClean(gateway.slug);
  });

  test('offers itself to a drag at all, the way every other card does', () => {
    const seated = flowNodesOf(judgedGraph(), {}, undefined, {
      onAddVirtualModel: () => {},
      onBindFrom: () => {},
    });

    expect(seated.find((node) => node.id === ADVISOR)?.draggable).toBe(true);
  });

  test('is remembered by the distance it came to rest at, never by a seat of its own', () => {
    const { world } = worldWhereWritesHang(gateway, {
      graph: judgedGraph(),
      seats: { [LADDER]: ROUTER_SEAT, [ADVISOR]: { x: 292, y: 240 } },
    });

    appliedSeatMoves(world)(letGoAt({ x: 460, y: 440 }));

    expect(canvasPositions(gateway.slug)).toEqual({
      [satelliteOffsetKey(ADVISOR)]: { x: 60, y: 140 },
    });
  });

  test('stands where the arrangement remembers it once the canvas seats everything', () => {
    const stored = { [LADDER]: ROUTER_SEAT, [satelliteOffsetKey(ADVISOR)]: { x: 60, y: 140 } };

    expect(seatsOf(judgedGraph(), stored, NOTHING_OVERLAID)[ADVISOR]).toEqual({ x: 460, y: 440 });
  });

  test('takes its shoulder seat where the arrangement remembers no drag', () => {
    expect(seatsOf(judgedGraph(), { [LADDER]: ROUTER_SEAT }, NOTHING_OVERLAID)[ADVISOR]).toEqual({
      x: ROUTER_SEAT.x + SATELLITE_SHOULDER.x,
      y: ROUTER_SEAT.y + SATELLITE_SHOULDER.y,
    });
  });
});
