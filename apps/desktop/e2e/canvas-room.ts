import type { Page } from '@playwright/test';

/** A spot in the window a pointer can be put at, which is not where the canvas seats its cards. */
export type Point = { x: number; y: number };

/** How much clearance a spot keeps from anything already standing, in window pixels. */
const CLEARANCE = 24;

/** How far a spot stays off the pane's own edges, past the band a drag pans the canvas from. */
const EDGE_CLEARANCE = 48;

const ACROSS = [0.5, 0.62, 0.74, 0.38, 0.86, 0.44, 0.56, 0.68, 0.8, 0.32];

const DOWN = [0.55, 0.68, 0.42, 0.8, 0.3, 0.62, 0.48, 0.74, 0.36, 0.86];

/**
 * A spot on the canvas nothing already covers, measured off the pane rather than guessed at.
 *
 * @summary A drop on empty canvas means empty wherever the arrangement happens to stand, so the
 * spot is chosen against the cards, their ports, and the corner furniture as they are. The ports
 * count because a cable let go inside a port's snap radius binds to that port rather than landing
 * on canvas, and that radius reaches out from the port's middle, past the card edge a card box
 * stops at. The pane's own edges ask for more room again: a cable held inside the outer band pans
 * the canvas under itself, which walks a card toward the pointer while it waits there. A canvas
 * with no room left is a scenario that cannot mean what it says.
 */
export async function emptyCanvasSpot(page: Page): Promise<Point> {
  const spot = await page.locator('.react-flow__pane').evaluate(
    (pane, { across, down, clearance, edgeClearance }) => {
      const field = pane.getBoundingClientRect();
      const taken = [
        ...document.querySelectorAll('.react-flow__node, .react-flow__panel, .react-flow__handle'),
      ].map((held) => held.getBoundingClientRect());

      const roomAround = (at: { x: number; y: number }) =>
        Math.min(
          ...taken.map((box) =>
            Math.max(box.left - at.x, at.x - box.right, box.top - at.y, at.y - box.bottom),
          ),
        );
      const roomToEdge = (at: { x: number; y: number }) =>
        Math.min(field.right - at.x, at.x - field.left, field.bottom - at.y, at.y - field.top);

      const roomiest = across
        .flatMap((sideways) =>
          down.map((downward) => ({
            x: field.left + field.width * sideways,
            y: field.top + field.height * downward,
          })),
        )
        .filter((at) => roomToEdge(at) >= edgeClearance)
        .map((at) => ({ at, room: roomAround(at) }))
        .toSorted((wider, narrower) => narrower.room - wider.room)
        .at(0);

      return roomiest !== undefined && roomiest.room >= clearance ? roomiest.at : null;
    },
    { across: ACROSS, down: DOWN, clearance: CLEARANCE, edgeClearance: EDGE_CLEARANCE },
  );

  if (spot === null) {
    throw new Error('the canvas leaves no empty spot a cable could be let go on');
  }

  return spot;
}
