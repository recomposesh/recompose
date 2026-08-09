import type { NodePositions, XY } from './canvas-positions';

import { storedPositionsRead } from './canvas-positions';

const POSITIONS_KEY = 'recompose.canvas.positions';

const held = new Map<string, NodePositions>();

const readers = new Set<() => void>();

function tellReaders(): void {
  for (const reader of readers) {
    reader();
  }
}

function keyFor(slug: string): string {
  return `${POSITIONS_KEY}.${slug}`;
}

/** Watches the canvas arrangements, so every node repaints the moment a seat moves. */
export function subscribeToCanvasPositions(reader: () => void): () => void {
  readers.add(reader);

  return () => {
    readers.delete(reader);
  };
}

/**
 * Where a person left this gateway's nodes, laid over nothing until a drag says otherwise.
 *
 * @summary Positions are view state per the storage rule, so a missing or unreadable value answers
 * as no arrangement and every node falls back to its tidy seat. The reading keeps its identity
 * between changes, which is what lets a render subscription tell a moved seat from a repeated look.
 */
export function canvasPositions(slug: string): NodePositions {
  const remembered = held.get(slug);

  if (remembered !== undefined) {
    return remembered;
  }

  const read = storedPositionsRead(localStorage.getItem(keyFor(slug)));

  held.set(slug, read);

  return read;
}

/** Takes the seat a drag is passing through, without writing it down. */
export function setNodePosition(slug: string, nodeId: string, position: XY): void {
  held.set(slug, { ...canvasPositions(slug), [nodeId]: position });
  tellReaders();
}

/**
 * Writes down the arrangement the drag came to rest at.
 *
 * @summary A drag passes through every seat between where it started and where it stopped, and
 * only the last of them is a choice, so the disk hears the gesture once rather than once a frame.
 */
export function keepCanvasPositions(slug: string): void {
  localStorage.setItem(keyFor(slug), JSON.stringify(canvasPositions(slug)));
}

/** Drops the whole arrangement, which is what the Tidy command asks for. */
export function dropCanvasPositions(slug: string): void {
  held.delete(slug);
  localStorage.removeItem(keyFor(slug));
  tellReaders();
}
