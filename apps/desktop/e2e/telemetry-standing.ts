import type { Page } from '@playwright/test';

import { expect } from '@playwright/test';

import { openGatewayCanvas } from './canvas-screen';
import { drawerStands, loggedRows, theLogsDrawerOpens } from './logs-drawer';
import { focusedGateway } from './scenario-memory';
import { SERVING_GATEWAY } from './served-gateway';
import { answersGiven } from './served-traffic';
import { rememberFooterReading, rememberWholeStream } from './telemetry-memory';
import { footerReading } from './traffic-footer';

/**
 * Waits for every turn this scenario sent to stand as a row, and answers how many stand.
 *
 * @summary One turn raises exactly one row, whether a provider answered it or the gateway raised it
 * alone, so the turns a scenario sent are the whole of what its drawer must come to hold. Waiting on
 * that rather than on a written-down number is what lets one arrangement serve a scenario that sent
 * no turns at all.
 */
export async function rowsMatchingTheTurnsSent(page: Page): Promise<number> {
  const sent = answersGiven(page).length;

  if (sent === 0) {
    await expect(loggedRows(page)).toHaveCount(0);

    return sent;
  }

  await expect(loggedRows(page).first()).toHaveAttribute('aria-setsize', String(sent));

  return sent;
}

/**
 * How many rows the run holds, which is not how many the list drew.
 *
 * @summary The list is virtualized, so the rows in the document are whichever window the
 * virtualizer is showing, and that window moves with the scroll and the viewport's height. The
 * count a scenario means is the whole run, which the list reports on every row as `aria-setsize`.
 *
 * Reading the drawn rows instead is what made "the new row waits at the top" fail on CI while
 * passing everywhere the window happened to be tall enough to draw them all.
 */
export async function rowsTheRunHolds(page: Page): Promise<number> {
  const reported = await loggedRows(page).first().getAttribute('aria-setsize');

  return Number(reported ?? 0);
}

/** Waits for the run to hold exactly this many rows, however many of them the list drew. */
export async function theRunHolds(page: Page, rows: number): Promise<void> {
  await expect(loggedRows(page).first()).toHaveAttribute('aria-setsize', String(rows));
}

/**
 * Opens the detail of the gateway the scenario is acting on.
 *
 * @summary It reads the focus rather than naming one gateway, because the sentence a person says
 * out loud is "the gateway detail" and two features now say it: the telemetry tree, which focuses
 * its serving gateway in its own background, and the routers tree, which focuses the gateway its
 * routed definition stands on. Naming one here would answer the other with the wrong screen.
 */
export async function theDetailStandsOpen(page: Page): Promise<void> {
  await openGatewayCanvas(page, focusedGateway(page));
}

/**
 * Stands the drawer open on the gateway detail, with every row sent so far already in it.
 *
 * @summary The strip's reading is kept as the drawer goes up, because a scenario that puts the
 * drawer away again has to read the strip it left behind rather than merely find one standing.
 */
export async function theDrawerStandsOpen(page: Page): Promise<void> {
  await theDetailStandsOpen(page);

  if (!(await drawerStands(page))) {
    rememberFooterReading(page, await footerReading(page));
    await theLogsDrawerOpens(page, SERVING_GATEWAY);
  }

  rememberWholeStream(page, await rowsMatchingTheTurnsSent(page));
}
