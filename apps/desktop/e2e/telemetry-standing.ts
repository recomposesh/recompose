import type { Page } from '@playwright/test';

import { expect } from '@playwright/test';

import { openGatewayCanvas } from './canvas-screen';
import { drawerStands, loggedRows, theLogsDrawerOpens } from './logs-drawer';
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

export async function theDetailStandsOpen(page: Page): Promise<void> {
  await openGatewayCanvas(page, SERVING_GATEWAY);
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
