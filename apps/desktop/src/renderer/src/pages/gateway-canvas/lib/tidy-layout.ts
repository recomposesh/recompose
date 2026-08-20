import type { NodePositions, XY } from './canvas-positions';
import type { CanvasNode } from './node-graph';

/** The measure every card declares itself at, which the columns are pitched around. */
export const CARD_MEASURE = { width: 184, height: 88 };

/** The clear span a cable crosses between one column's card and the next one's, in pixels. */
const CABLE_SPAN = 136;

/**
 * The measure a judge satellite declares itself at, which is smaller than any card.
 *
 * @summary The height is the round silhouette and nothing else, because the node carries no
 * caption: a declared box taller than what the node paints would reserve canvas nobody can see and
 * shorten the tie by exactly that much.
 */
export const SATELLITE_MEASURE = { width: 96, height: 44 };

const COLUMN_PITCH = CARD_MEASURE.width + CABLE_SPAN;

/**
 * The clear space a satellite keeps from the card above it and the router under it, in pixels.
 *
 * @summary It is the tie's whole length. The tie is dashed, and a span of a few pixels draws one
 * dash, which reads as a join rather than as the broken line that says a judge advises rather than
 * answers, so the clearance has to leave the rhythm room to repeat.
 */
const SATELLITE_CLEARANCE = 32;

/**
 * How far one row stands from the next, which is whatever a satellite needs between two cards.
 *
 * @summary A judge seats above the router it advises, so the gap between two rows is not spare
 * canvas: it is the room the advisor stands in. Deriving the pitch from that room rather than
 * fixing it is what keeps the arrangement from seating an advisor on top of the row above it the
 * next time either measure moves.
 */
const ROW_PITCH = CARD_MEASURE.height + SATELLITE_MEASURE.height + SATELLITE_CLEARANCE * 2;

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
 * Where a judge stands off its router until somebody moves it, measured from the router's corner.
 *
 * @summary It seats centered over the card's top edge rather than off to the start side, because a
 * judge belongs to the router beneath it and an advisor drifting left reads as a card of its own
 * that a request could travel to. The row pitch is sized to hold it, so the satellite clears the
 * card above it as well as the router under it.
 */
export const SATELLITE_SHOULDER: XY = {
  x: (CARD_MEASURE.width - SATELLITE_MEASURE.width) / 2,
  y: -(SATELLITE_MEASURE.height + SATELLITE_CLEARANCE),
};

/**
 * What the arrangement remembers one satellite's own place under, which is never a card seat.
 *
 * @summary A satellite has no seat of its own to remember: it stands off its router, so what
 * survives a drag is the distance rather than the point. The name is kept apart from the card seats
 * so the tidy arrangement, which decides which cards stand at all, drops it on sight and a
 * satellite whose judge left the table cannot leave a stray point behind.
 */
export function satelliteOffsetKey(judgeNodeId: string): string {
  return `satellite:${judgeNodeId}`;
}

/** The distance a satellite came to rest at, read off the router it advises. */
export function satelliteOffset(router: XY, at: XY): XY {
  return { x: at.x - router.x, y: at.y - router.y };
}

/**
 * Where every judge stands, which is an offset from its router rather than a seat of its own.
 *
 * @summary A judge advises one router, so it belongs beside that router wherever the router ends
 * up: taking a column would put an advisor in the row of things a request travels to, and taking a
 * row would push a router's own children down a place. Reading the seats as they already stand is
 * what lets a dragged router carry its judge, so the tie never stretches across the canvas, and it
 * is why a satellite a person moved is remembered as a distance rather than as a point: the move
 * survives a drag of the router underneath it. A judge whose router the canvas does not stand seats
 * nowhere, because an advisor with nothing to advise stands for nothing.
 */
function satelliteSeat(
  node: CanvasNode,
  seats: NodePositions,
  offsets: NodePositions,
): XY | undefined {
  const router = node.kind === 'judge' ? seats[node.advises] : undefined;

  if (router === undefined) {
    return undefined;
  }

  const off = offsets[satelliteOffsetKey(node.id)] ?? SATELLITE_SHOULDER;

  return { x: router.x + off.x, y: router.y + off.y };
}

export function satellitesFollowTheirRouters(
  nodes: readonly CanvasNode[],
  seats: NodePositions,
  offsets: NodePositions = {},
): NodePositions {
  const settled: Record<string, XY> = { ...seats };

  for (const node of nodes) {
    const seat = satelliteSeat(node, settled, offsets);

    if (seat !== undefined) {
      settled[node.id] = seat;
    }
  }

  return settled;
}

/**
 * The row one card takes in its column, which is never above the card it hangs off.
 *
 * @summary The graph hands its cards over parent first, so the last card placed in the column to
 * the left is the one this card was bound from. Starting on that row is what puts a router's first
 * child beside it rather than back at the top of its column, where a canvas already holding other
 * definitions would strand it rows above the router that took it. The column's own counter still
 * wins wherever it stands lower, so siblings stack downward and no two cards share a seat.
 */
function rowFor(column: number, rows: Map<number, number>, placed: Map<number, number>): number {
  return Math.max(rows.get(column) ?? 0, placed.get(column - 1) ?? 0);
}

/**
 * Where every card stands once the canvas arranges itself, read left to right by role.
 *
 * @summary A request travels from the gateway through a virtual model to a target, so the columns
 * run in that direction and a person reads the composition the way it runs. The columns stand one
 * pitch apart, so a binding's cable reads at a glance instead of crossing an empty field. The graph
 * hands its route nodes over entry first and each child before its own children, so one router's
 * children open on that router's own row and stack downward from there, and the cables fan without
 * crossing. A judge takes no place in that arrangement at all: it seats off its router once every
 * card has one.
 */
export function tidyPositions(nodes: readonly CanvasNode[]): NodePositions {
  const rows = new Map<number, number>();
  const placed = new Map<number, number>();
  const seats: Record<string, XY> = {};

  for (const node of nodes) {
    if (node.kind === 'judge') {
      continue;
    }

    const column = columnOf(node);
    const row = rowFor(column, rows, placed);

    rows.set(column, row + 1);
    placed.set(column, row);
    seats[node.id] = { x: column * COLUMN_PITCH, y: row * ROW_PITCH };
  }

  return satellitesFollowTheirRouters(nodes, seats);
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

/**
 * Where a card born from another card stands, which is the row the card that asked stands on.
 *
 * @summary A cable between two cards on one row runs flat, and that is the whole reason: a born
 * card sent to its column's next free row lands above or below the card it answers to, and the
 * cable draws a cramped S to cross back. The row gives way only when something already stands in
 * it, because two cards in one seat is worse than a bent cable.
 */
export function seatBesideAsker(column: number, asker: XY, placed: NodePositions): XY {
  const x = column * COLUMN_PITCH;
  const taken = Object.values(placed).some((seat) => seat.x === x && seat.y === asker.y);

  return taken ? seatForNewNode(column, placed) : { x, y: asker.y };
}
