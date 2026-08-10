/** Where a node stands on the canvas, in the flow's own coordinates. */
export type XY = { readonly x: number; readonly y: number };

/** Where every node stands, read by node id. */
export type NodePositions = Readonly<Record<string, XY>>;

const NOTHING_HELD: NodePositions = {};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return Number.isFinite(value);
}

/** Whether a written value reads as a seat, which the draft store leans on too. */
export function isSeat(value: unknown): value is XY {
  return isRecord(value) && isFiniteNumber(value['x']) && isFiniteNumber(value['y']);
}

function isSeats(value: unknown): value is Record<string, XY> {
  return isRecord(value) && Object.values(value).every(isSeat);
}

/**
 * The positions a person dragged their nodes to, as the last session left them written.
 *
 * @summary Positions are view state, so a value this cannot read answers with none rather than
 * with a refusal: every node falls back to its tidy seat and a person drags the few they care
 * about again. One unreadable seat discards the whole reading, because a canvas holding some
 * remembered nodes beside some tidied ones reads as an arrangement nobody chose.
 */
export function storedPositionsRead(written: string | null): NodePositions {
  try {
    const read: unknown = JSON.parse(written ?? '');

    return isSeats(read) ? read : NOTHING_HELD;
  } catch {
    return NOTHING_HELD;
  }
}

/**
 * Where every node stands once the positions a person chose lie over the tidy arrangement.
 *
 * @summary The tidy seats decide which nodes stand at all, so a position held for a node that
 * left the canvas seats nothing and cannot resurrect it. Every node the graph still carries keeps
 * the place a person dragged it to, and one nobody moved takes the seat tidy gave it.
 */
export function heldOver(tidy: NodePositions, held: NodePositions): NodePositions {
  const laid: Record<string, XY> = {};

  for (const [nodeId, seat] of Object.entries(tidy)) {
    laid[nodeId] = held[nodeId] ?? seat;
  }

  return laid;
}
