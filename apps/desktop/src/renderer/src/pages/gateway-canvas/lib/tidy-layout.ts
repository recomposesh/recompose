import type { NodePositions, XY } from './canvas-positions';
import type { CanvasNode, CanvasNodeKind } from './node-graph';

const COLUMN_PITCH = 320;
const ROW_PITCH = 140;

const COLUMN_OF_KIND: Record<CanvasNodeKind, number> = {
  gateway: 0,
  'virtual-model': 1,
  'draft-model': 1,
  target: 3,
  'ghost-target': 3,
  'pending-target': 3,
};

function columnX(kind: CanvasNodeKind): number {
  return COLUMN_OF_KIND[kind] * COLUMN_PITCH;
}

/**
 * Where every card stands once the canvas arranges itself, read left to right by role.
 *
 * @summary A request travels from the gateway through a virtual model to a target, so the columns
 * run in that direction and a person reads the composition the way it runs. The third column
 * stays empty in every arrangement, so the routing feature seats its cards there without moving a
 * single card a person already knows the place of.
 */
export function tidyPositions(nodes: readonly CanvasNode[]): NodePositions {
  const rows = new Map<number, number>();
  const seats: Record<string, XY> = {};

  for (const node of nodes) {
    const column = COLUMN_OF_KIND[node.kind];
    const row = rows.get(column) ?? 0;

    rows.set(column, row + 1);
    seats[node.id] = { x: column * COLUMN_PITCH, y: row * ROW_PITCH };
  }

  return seats;
}

/**
 * Where a card being born stands, which is where the tidy arrangement would have seated it.
 *
 * @summary A draft and a card waiting on a pick both arrive while other cards already stand, so
 * they take the next place down their own column rather than the seat tidy would give them on an
 * empty canvas. The column reads as it stands rather than as it was tidied, so a card born under
 * one a person dragged low follows the drag instead of landing on top of it.
 */
export function seatForNewNode(kind: CanvasNodeKind, placed: NodePositions): XY {
  const x = columnX(kind);
  const column = Object.values(placed).filter((seat) => seat.x === x);

  if (column.length === 0) {
    return { x, y: 0 };
  }

  return { x, y: Math.max(...column.map((seat) => seat.y)) + ROW_PITCH };
}
