import type { Locator, Page } from '@playwright/test';

import { expect } from '@playwright/test';

import { canvasTool, portAskOn } from './canvas-screen';

/**
 * Takes up a port's ask the way a keyboard does.
 *
 * @summary The ask paints only under keyboard focus and lets every pointer event pass through,
 * so a click can never reach it: focus and Enter are the one way in, which is the point.
 */
export async function takeUpThePortAsk(page: Page, nodeId: string): Promise<void> {
  await portAskOn(page, nodeId).focus();
  await page.keyboard.press('Enter');
}

/** A spot in the window a pointer can be put at, which is not where the canvas seats its cards. */
export type Point = { x: number; y: number };

/** What chasing a port that keeps sliding away may spend before the drag is called lost. */
const CHASE_MS = 5000;

/** How much clearance a spot keeps from anything already standing, in window pixels. */
const CLEARANCE = 24;

const ACROSS = [0.5, 0.62, 0.74, 0.38, 0.86];

const DOWN = [0.55, 0.68, 0.42, 0.8, 0.3];

/** Where a card is taken hold of, clear of the plus that hangs off its far edge. */
const GRIP = { x: 12, y: 12 };

/** How far above a port's middle a cable is taken hold of, inside the port's own hit target. */
const PORT_GRIP_RISE = 6;

async function boxOf(
  target: Locator,
): Promise<{ x: number; y: number; width: number; height: number }> {
  const box = await target.boundingBox();

  if (box === null) {
    throw new Error('the gesture found nothing standing where it meant to press');
  }

  return box;
}

async function middleOf(target: Locator): Promise<Point> {
  const box = await boxOf(target);

  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/**
 * Where a press lands to take hold of a cable, which is the port rather than its exact middle.
 *
 * @operation The card draws a hairline of wire beside the port and paints it after the port, so
 * the very middle of the port belongs to that decoration rather than to the port. A press there
 * starts nothing at all. The grip therefore rides a few pixels up, well inside the port's own
 * twenty-four pixel target, which is where a person pressing the dot lands anyway.
 */
async function portGrip(port: Locator): Promise<Point> {
  const box = await boxOf(port);

  return { x: box.x + box.width / 2, y: box.y + box.height / 2 - PORT_GRIP_RISE };
}

function partWay(from: Point, to: Point, through: number): Point {
  return { x: from.x + (to.x - from.x) * through, y: from.y + (to.y - from.y) * through };
}

/**
 * Walks the pointer from where it stands to a spot, in the several moves a drag is read from.
 *
 * @operation The moves are written out rather than asked for by a count, because the count option
 * lands the last move one step short of the spot and a cable that stops beside a port never
 * reaches it. A drag also starts only once a press has traveled, so the first move is short.
 */
async function travel(page: Page, from: Point, to: Point): Promise<void> {
  const nudged = partWay(from, to, 0.1);
  const quarter = partWay(from, to, 0.25);
  const half = partWay(from, to, 0.5);
  const most = partWay(from, to, 0.8);

  await page.mouse.move(nudged.x, nudged.y);
  await page.mouse.move(quarter.x, quarter.y);
  await page.mouse.move(half.x, half.y);
  await page.mouse.move(most.x, most.y);
  await page.mouse.move(to.x, to.y);
}

/**
 * Brings the whole composition inside the pane, the way a person does before reaching for a card.
 *
 * @operation The canvas opens at its resting viewport, which on a narrow window leaves the target
 * column beyond the right edge. A pointer cannot press what the window does not show, so a
 * gesture that must land on a card out there asks the canvas to fit first, the same way a person
 * reaches for the tool in the corner rather than guessing where the card went. The fit presses
 * again until every card stands inside the pane itself rather than the window, because a fit
 * taken while the inspector is still sliding in reads a pane that is about to shrink, and the
 * target column settles under the inspector where no pointer can reach it.
 */
export async function fitCanvasToView(page: Page): Promise<void> {
  await expect
    .poll(async () => {
      await canvasTool(page, 'Zoom to fit').click();

      return page.locator('.react-flow__pane').evaluate((pane) => {
        const field = pane.getBoundingClientRect();

        return [...document.querySelectorAll('.react-flow__node')].every((card) => {
          const box = card.getBoundingClientRect();

          return box.left >= field.left && box.right <= field.right;
        });
      });
    })
    .toBe(true);
}

/** How many fresh presses a grip may take before the gesture is called lost. */
const GRIP_ATTEMPTS = 4;

/** What one press may spend waiting for the canvas to answer it with a line. */
const LINE_WAIT_MS = 1200;

/**
 * Presses a port until the canvas answers with a connection line, off a fresh box every time.
 *
 * @operation Edges settle a beat after the cards, so right after a fit an anchor's box can read
 * where the anchor stood rather than where it stands, and a press there starts nothing. Each
 * attempt re-reads the box, presses, and travels the short first move a drag is read from; the
 * pointer is let go only after a whole wait answered no line, because a release any earlier could
 * land a started-but-unpainted drag as a real drop.
 */
async function whatStandsAt(port: Locator, spot: Point): Promise<string> {
  return port.evaluate((own, { x, y }) => {
    const hit = document.elementFromPoint(x, y);

    if (hit === null) {
      return 'nothing';
    }

    if (own === hit || own.contains(hit)) {
      return 'the port';
    }

    return `${hit.tagName.toLowerCase()}.${hit.getAttribute('class') ?? ''}`.slice(0, 90);
  }, spot);
}

async function grippedCable(page: Page, port: Locator, toward: Point): Promise<Point> {
  let stood = 'unread';

  for (let attempt = 0; attempt < GRIP_ATTEMPTS; attempt += 1) {
    const start = await portGrip(port);

    stood = await whatStandsAt(port, start);

    if (stood !== 'the port') {
      await fitCanvasToView(page);
      continue;
    }

    const nudged = partWay(start, toward, 0.1);

    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(nudged.x, nudged.y);

    try {
      await expect(page.locator('.react-flow__connectionline')).toBeVisible({
        timeout: LINE_WAIT_MS,
      });

      return start;
    } catch {
      await page.mouse.up();
    }
  }

  throw new Error(`no press took hold of the cable; the grip point offered ${stood}`);
}

/** Pulls a cable out of a port and holds it over a spot, leaving the drag in flight. */
export async function pullCableTo(page: Page, port: Locator, toward: Point): Promise<void> {
  const start = await grippedCable(page, port, toward);

  await travel(page, start, toward);
}

/** Lets a cable in flight go where the pointer stands, which is where the drop is read. */
export async function releaseCable(page: Page): Promise<void> {
  await page.mouse.up();
}

/**
 * Steers a cable in flight onto a port and waits for the canvas to say it has arrived.
 *
 * @operation A port near the pane's edge pans the canvas out from under the pointer, so a single
 * move aimed at where the port stood lands on empty canvas instead. The chase follows the port to
 * wherever it has slid and stops on the canvas marking it as the landing, which is the same
 * acknowledgement a person steers by.
 */
async function chaseTo(page: Page, onto: Locator): Promise<void> {
  await expect
    .poll(
      async () => {
        const at = await middleOf(onto);

        await page.mouse.move(at.x, at.y);

        return onto.evaluate((port) => port.classList.contains('connectingto'));
      },
      { timeout: CHASE_MS },
    )
    .toBe(true);
}

/** Pulls a cable out of a port and drops it on a card's port, in one gesture. */
export async function dragCableOnto(page: Page, port: Locator, onto: Locator): Promise<void> {
  await pullCableTo(page, port, await middleOf(onto));
  await chaseTo(page, onto);
  await page.mouse.up();
}

/** Pulls a cable out of a port and lets it go at a spot on the canvas. */
export async function dropCableAt(page: Page, port: Locator, at: Point): Promise<void> {
  await pullCableTo(page, port, at);
  await page.mouse.up();
}

/** Takes hold of a card and moves it across the canvas, the way a person rearranges it. */
export async function dragCardBy(page: Page, card: Locator, by: Point): Promise<void> {
  const box = await card.boundingBox();

  if (box === null) {
    throw new Error('the gesture found no card standing where it meant to take hold');
  }

  const start = { x: box.x + GRIP.x, y: box.y + GRIP.y };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await travel(page, start, { x: start.x + by.x, y: start.y + by.y });
  await page.mouse.up();
}

/**
 * A spot on the canvas nothing already covers, measured off the pane rather than guessed at.
 *
 * @summary A drop on empty canvas means empty wherever the arrangement happens to stand, so the
 * spot is chosen against the cards and the corner furniture as they are, with room to spare on
 * every side. A canvas with no room left is a scenario that cannot mean what it says.
 */
export async function emptyCanvasSpot(page: Page): Promise<Point> {
  const spot = await page.locator('.react-flow__pane').evaluate(
    (pane, { across, down, clearance }) => {
      const field = pane.getBoundingClientRect();
      const taken = [...document.querySelectorAll('.react-flow__node, .react-flow__panel')].map(
        (held) => held.getBoundingClientRect(),
      );
      const spots = across.flatMap((sideways) =>
        down.map((downward) => ({
          x: field.left + field.width * sideways,
          y: field.top + field.height * downward,
        })),
      );

      return (
        spots.find(
          (at) =>
            !taken.some(
              (box) =>
                at.x > box.left - clearance &&
                at.x < box.right + clearance &&
                at.y > box.top - clearance &&
                at.y < box.bottom + clearance,
            ),
        ) ?? null
      );
    },
    { across: ACROSS, down: DOWN, clearance: CLEARANCE },
  );

  if (spot === null) {
    throw new Error('the canvas leaves no empty spot a cable could be let go on');
  }

  return spot;
}
