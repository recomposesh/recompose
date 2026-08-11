import type { Locator, Page } from '@playwright/test';

import { expect } from '@playwright/test';

/** The toolbar control that stands the logs drawer up and puts it away. */
export function logsControl(page: Page): Locator {
  return page.getByRole('toolbar').getByRole('button', { exact: true, name: 'Request log' });
}

/** Which cell of a row carries which fact, in the order a person reads across the row. */
export const ROW_CELLS = {
  time: 0,
  method: 1,
  models: 2,
  provider: 3,
  account: 4,
  status: 5,
  duration: 6,
} as const;

/** The logs drawer in the canvas column, named by the surface's own stable marker. */
function logsDrawer(page: Page): Locator {
  return page.locator('[data-canvas-column] > [data-logs-drawer]');
}

export function drawerHeader(page: Page): Locator {
  return logsDrawer(page).locator('header');
}

/** The drawer's own heading, which names the canvas subject currently scoping the rows. */
export function logsHeading(page: Page, subject: string): Locator {
  return logsDrawer(page).getByRole('heading', {
    exact: true,
    level: 2,
    name: `Logs for ${subject}`,
  });
}

/** The visible kind printed beside the selected subject's name. */
export function logsSubjectType(page: Page, type: string): Locator {
  return drawerHeader(page).getByText(type, { exact: true });
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

/** The exclusive outcome filter group in the drawer header. */
export function logFilters(page: Page): Locator {
  return drawerHeader(page).getByRole('radiogroup', { exact: true, name: 'Log filter' });
}

/** One mutually exclusive outcome choice in the All / Success / Errors control. */
export function logFilter(page: Page, label: string): Locator {
  return logFilters(page).getByRole('radio', { exact: true, name: label });
}

/** Presses the toolbar's disclosure and waits for the drawer to stand under the stage. */
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
    const stage = boxOf(':scope > section:not([data-logs-drawer])');
    const drawer = boxOf(':scope > [data-logs-drawer]');
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
 * Whether the logs keep the whole left canvas column while the inspector keeps the full-height
 * column beside it, with neither panel covering the other.
 */
export async function logsAndInspectorKeepTheirColumns(page: Page): Promise<boolean> {
  return page.locator('[data-canvas-workspace]').evaluate((workspace) => {
    const standingIn = (root: ParentNode | null, selector: string): HTMLElement | null =>
      root === null ? null : root.querySelector<HTMLElement>(selector);
    const near = (first: number, second: number): boolean => Math.abs(first - second) <= 1;
    const drawerKeepsTheCanvasColumn = (drawerBox: DOMRect, canvasBox: DOMRect): boolean =>
      drawerBox.width > 0 &&
      near(drawerBox.left, canvasBox.left) &&
      near(drawerBox.right, canvasBox.right);
    const inspectorKeepsItsFullColumn = (inspectorBox: DOMRect, canvasBox: DOMRect): boolean =>
      inspectorBox.width > 0 &&
      near(inspectorBox.top, canvasBox.top) &&
      near(inspectorBox.bottom, canvasBox.bottom);
    const neitherCoversTheOther = (
      canvasBox: DOMRect,
      drawerBox: DOMRect,
      inspectorBox: DOMRect,
    ): boolean =>
      drawerKeepsTheCanvasColumn(drawerBox, canvasBox) &&
      drawerBox.right <= inspectorBox.left &&
      inspectorKeepsItsFullColumn(inspectorBox, canvasBox);

    const column = standingIn(workspace, ':scope > [data-canvas-column]');
    const drawer = standingIn(column, ':scope > [data-logs-drawer]');
    const inspector = standingIn(workspace, ':scope > aside[data-panel-control]');

    if (column === null || drawer === null || inspector === null) {
      return false;
    }

    return neitherCoversTheOther(
      column.getBoundingClientRect(),
      drawer.getBoundingClientRect(),
      inspector.getBoundingClientRect(),
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
