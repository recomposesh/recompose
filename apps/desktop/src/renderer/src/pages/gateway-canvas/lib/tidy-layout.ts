import type { NodePositions, XY } from './canvas-positions';
import type { CanvasNode } from './node-graph';

/** The measure every card declares itself at, which the columns are pitched around. */
export const CARD_MEASURE = { width: 184, height: 88 };

/** The clear span a cable crosses between one column's card and the next one's, in pixels. */
export const CABLE_SPAN = 136;

/** The measure a judge satellite declares itself at, which is smaller than any card. */
export const SATELLITE_MEASURE = { width: 96, height: 72 };

const COLUMN_PITCH = CARD_MEASURE.width + CABLE_SPAN;
const ROW_PITCH = 150;

/** The column a virtual model and the draft standing in for one both seat in. */
export const MODEL_COLUMN = 1;

/** The column a virtual model's own binding seats in, which every route node counts out from. */
export const ROUTE_COLUMN = 2;

const COLUMN_OF_STANDING_KIND = {
  gateway: 0,
  'virtual-model': MODEL_COLUMN,
  'draft-model': MODEL_COLUMN,
  'pending-target': ROUTE_COLUMN,
} as const;

/**
 * The column one card seats in, which its role decides for everything but a route node.
 *
 * @summary A route node counts its column out from its depth in the routing graph rather than from
 * its kind, so a directly bound target stays exactly one pitch from its model and no gateway
 * composed before routers existed moves a card. A router inserted above a binding pushes what it
 * displaced one pitch right by that same arithmetic, without a stored seat moving.
 */
function columnOf(node: CanvasNode): number {
  return 'depth' in node ? ROUTE_COLUMN + node.depth : COLUMN_OF_STANDING_KIND[node.kind];
}

/** Seats a route node's child in the column beyond its parent, on the parent's own row. */
export function childSeatBeside(parentSeat: XY): XY {
  return { x: parentSeat.x + COLUMN_PITCH, y: parentSeat.y };
}

/**
 * The column a card bound from another stands in, which is one beyond the card it was bound from.
 *
 * @summary A request travels left to right, so what a card binds stands beyond it whether the ask
 * came from a plus or from a dropped cable. The column counts out of the parent's own depth rather
 * than off the binding column, so a child of a nested router lands beyond that router instead of
 * back on the entry's row with its cable running the wrong way. A card the canvas no longer stands
 * falls back to the binding column, which is where every binding stood before routers existed.
 */
export function columnBeyond(parent: CanvasNode | undefined): number {
  return parent === undefined ? ROUTE_COLUMN : columnOf(parent) + 1;
}

/**
 * Where every card stands once the canvas arranges itself, read left to right by role.
 *
 * @summary A request travels from the gateway through a virtual model to a target, so the columns
 * run in that direction and a person reads the composition the way it runs. The columns stand one
 * pitch apart, so a binding's cable reads at a glance instead of crossing an empty field. The graph
 * hands its route nodes over entry first and each child before its own children, so one router's
 * children take adjacent rows in their column and the cables fan without crossing.
 */
export function tidyPositions(nodes: readonly CanvasNode[]): NodePositions {
  const rows = new Map<number, number>();
  const seats: Record<string, XY> = {};

  for (const node of nodes) {
    const column = columnOf(node);
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
export function seatForNewNode(column: number, placed: NodePositions): XY {
  const x = column * COLUMN_PITCH;
  const standing = Object.values(placed).filter((seat) => seat.x === x);

  if (standing.length === 0) {
    return { x, y: 0 };
  }

  return { x, y: Math.max(...standing.map((seat) => seat.y)) + ROW_PITCH };
}
