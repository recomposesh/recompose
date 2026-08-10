import type { Locator, Page } from '@playwright/test';

import { expect } from '@playwright/test';

import { logsControl } from './traffic-footer';

/** Which cell of a row carries which fact, in the order a person reads across the row. */
export const ROW_CELLS = {
  time: 0,
  method: 1,
  models: 2,
  servedBy: 3,
  status: 4,
  duration: 5,
} as const;

/** What the duration cell says to a screen reader where a failed request filled it with nothing. */
export const NO_DURATION = 'no duration';

/**
 * The logs drawer, which is the one panel in the canvas column that heads itself.
 *
 * @operation The panel is a plain section carrying no name of its own, so it answers no role a
 * reading could ask for. It is found by its place in the column and by heading itself, which is
 * exactly what tells it from the stage above it.
 */
function logsDrawer(page: Page): Locator {
  return page.locator('[data-canvas-column] > section:has(> header)');
}

export function drawerHeader(page: Page): Locator {
  return logsDrawer(page).locator('header');
}

/** The drawer's own heading, which names the gateway whose requests it streams. */
export function logsHeading(page: Page, gateway: string): Locator {
  return page.getByRole('heading', { exact: true, level: 2, name: `Logs · ${gateway}` });
}

/** Whether the drawer stands at all, which is a state to read rather than a thing to assert. */
export async function drawerStands(page: Page): Promise<boolean> {
  return (await logsDrawer(page).count()) > 0;
}

export function closeLogsControl(page: Page): Locator {
  return drawerHeader(page).getByRole('button', { name: 'Close logs' });
}

/** The border a person drags to size the drawer, which stands above it rather than inside it. */
export function logsHeightHandle(page: Page): Locator {
  return page.getByRole('separator', { name: 'Logs height' });
}

/** How tall the drawer stands, read off the border that sizes it. */
export async function drawerHeight(page: Page): Promise<number> {
  const standing = await logsHeightHandle(page).getAttribute('aria-valuenow');

  if (standing === null) {
    throw new Error('the drawer border reports no height a scenario could read');
  }

  return Number(standing);
}

/** The run of rows, which is one tab stop with a cursor the arrows walk. */
export function servedRequests(page: Page): Locator {
  return logsDrawer(page).getByRole('listbox', { name: 'Served requests' });
}

export function loggedRows(page: Page): Locator {
  return servedRequests(page).getByRole('option');
}

/** The cells one row prints, in the order a person reads across it. */
export async function rowCells(row: Locator): Promise<string[]> {
  return row
    .locator('xpath=./span')
    .evaluateAll((cells) => cells.map((cell) => cell.textContent.trim()));
}

/** The cells of every standing row, so a scenario can read a whole run at once. */
export async function everyRowsCells(page: Page): Promise<string[][]> {
  const standing = await loggedRows(page).all();

  return Promise.all(standing.map(async (row) => rowCells(row)));
}

/**
 * Whether a cell prints its whole reading rather than a cut-short one.
 *
 * @operation A cut-short cell still holds all of its text, so the reading comes off the measure the
 * browser gave it: a cell whose content runs wider than the cell itself is a cell a person cannot
 * read to the end of.
 */
export async function readsInFull(row: Locator, cell: number): Promise<boolean> {
  return row
    .locator('xpath=./span')
    .nth(cell)
    .evaluate((held) => held.scrollWidth <= held.clientWidth);
}

/** How far down the run a reader has scrolled, in pixels off the top of the whole run. */
export async function scrolledBy(page: Page): Promise<number> {
  return servedRequests(page).evaluate((run) => run.scrollTop);
}

/**
 * The row standing at the top of what a reader can see, named by its own id.
 *
 * @operation A person's place in the run is the row under their eyes rather than the row the run
 * begins with, so the reading picks the first row whose foot has come into the viewport.
 */
export async function rowAtTheTopOfTheView(page: Page): Promise<string> {
  return servedRequests(page).evaluate((run) => {
    const top = run.getBoundingClientRect().top;
    const seen = [...run.querySelectorAll('[role="option"]')].find(
      (row) => row.getBoundingClientRect().bottom > top,
    );

    return seen?.id ?? '';
  });
}

/** Scrolls the run down, the way a person reading back through history does. */
export async function theRunScrollsDown(page: Page, by: number): Promise<void> {
  await servedRequests(page).evaluate((run, distance) => {
    run.scrollTop = distance;
  }, by);
}

/** Which row the cursor points a reader at, named by the request it stands on. */
export async function rowUnderCursor(page: Page): Promise<string | null> {
  return servedRequests(page).getAttribute('aria-activedescendant');
}

/** One exclusive scope in the drawer's strip, which is a canvas card said as a segment. */
export function logScope(page: Page, label: string): Locator {
  return drawerHeader(page).getByRole('radio', { exact: true, name: label });
}

/** Every exclusive scope the strip keeps in reach, before the overflow holds the rest. */
export function logScopes(page: Page): Locator {
  return drawerHeader(page).getByRole('radio');
}

/** The narrowing that stands apart from the scopes and only ever takes requests away. */
export function errorsFilter(page: Page): Locator {
  return drawerHeader(page).getByRole('button', { exact: true, name: 'Errors' });
}

/** The way to the scopes the strip ran out of room for. */
export function scopeOverflow(page: Page): Locator {
  return drawerHeader(page).getByRole('button', { name: 'More log scopes' });
}

/** Presses the strip's disclosure and waits for the drawer to stand under the stage. */
export async function theLogsDrawerOpens(page: Page, gateway: string): Promise<void> {
  await logsControl(page).click();
  await expect(logsHeading(page, gateway)).toBeVisible();
}

/**
 * Whether the drawer stands under the stage and over the strip, sharing the column with both.
 *
 * @operation The order comes off where the three actually stand rather than off the markup, because
 * a drawer that covered the stage would read the same way in the document and quite differently to
 * a person reaching for a card.
 */
export async function drawerSharesTheColumn(page: Page): Promise<boolean> {
  return page.locator('[data-canvas-column]').evaluate((column) => {
    const boxOf = (selector: string): DOMRect =>
      column.querySelector(selector)?.getBoundingClientRect() ?? new DOMRect();
    const stage = boxOf(':scope > section:not(:has(> header))');
    const drawer = boxOf(':scope > section:has(> header)');
    const strip = boxOf(':scope > footer');

    return (
      stage.height > 0 &&
      drawer.height > 0 &&
      stage.bottom <= drawer.top &&
      drawer.bottom <= strip.top
    );
  });
}

/**
 * Proves the drawer narrowed from the whole stream and nothing listed escapes the narrowing.
 *
 * @summary Every "only ... remain" step says the same three things: the run shrank from the whole
 * stream, something is still listed, and no listed row escapes the rule that narrowed it. Saying
 * them once here keeps that assertion one piece of knowledge across the step files.
 */
export async function onlyRowsRemain(
  page: Page,
  streamBefore: number,
  keeps: (cells: readonly string[]) => boolean,
): Promise<void> {
  await expect(loggedRows(page)).not.toHaveCount(streamBefore);

  const listed = await everyRowsCells(page);

  expect(listed).not.toEqual([]);
  expect(listed.filter((cells) => !keeps(cells))).toEqual([]);
}
