import { expect } from '@playwright/test';

import { Given, Then, When } from '../fixtures';
import { haltGateway } from '../gateway-screen';
import {
  drawerHeader,
  loggedRows,
  logsHeading,
  logsSubjectType,
  ROW_CELLS,
  rowAtTheTopOfTheView,
  rowCells,
  scrolledBy,
  theRunScrollsDown,
} from '../logs-drawer';
import { SERVING_GATEWAY } from '../served-gateway';
import { turnsThrough, turnThrough } from '../served-traffic';
import {
  cursorRowBefore,
  rememberCursorRow,
  rememberWholeStream,
  wholeStreamBefore,
} from '../telemetry-memory';
import { rowsMatchingTheTurnsSent, rowsTheRunHolds, theRunHolds } from '../telemetry-standing';

/** How many requests fill the run past the drawer's own height, so history can be scrolled back. */
const MORE_THAN_ONE_SCREEN = 25;

/** How far down the run a reader travels before the next request lands above them. */
const SCROLLED_DOWN = 150;

/** How many rows one scenario stands before it stops the gateway. */
const A_FEW_ROWS = 3;

Given('the person scrolled down the list', async ({ page }) => {
  await turnsThrough(page, 'creative', MORE_THAN_ONE_SCREEN);
  await rowsMatchingTheTurnsSent(page);
  await theRunScrollsDown(page, SCROLLED_DOWN);
  await expect.poll(async () => scrolledBy(page)).toBeGreaterThan(0);

  rememberCursorRow(page, await rowAtTheTopOfTheView(page));
  rememberWholeStream(page, await rowsTheRunHolds(page));
});

Given('rows standing in the list', async ({ page }) => {
  await turnsThrough(page, 'creative', A_FEW_ROWS);

  rememberWholeStream(page, await rowsMatchingTheTurnsSent(page));
});

When('{string} serves a request', async ({ page }, gateway: string) => {
  expect(gateway).toBe(SERVING_GATEWAY);
  await turnThrough(page, 'creative');
});

When('the person reads the drawer header', async ({ page }) => {
  await expect(drawerHeader(page)).toBeVisible();
});

When('the person stops {string}', async ({ page }, gateway: string) => {
  expect(gateway).toBe(SERVING_GATEWAY);
  await haltGateway(page, gateway);
});

Then('a new row stands at the top of the list', async ({ page }) => {
  await theRunHolds(page, wholeStreamBefore(page) + 1);

  const newest = await rowCells(loggedRows(page).first());

  expect(newest[ROW_CELLS.models] ?? '').toContain('creative');
});

Then('the list holds its scroll place', async ({ page }) => {
  await expect.poll(async () => rowAtTheTopOfTheView(page)).toBe(cursorRowBefore(page));
});

Then('the new row waits at the top', async ({ page }) => {
  await theRunHolds(page, wholeStreamBefore(page) + 1);
  await expect.poll(async () => scrolledBy(page)).toBeGreaterThan(0);
});

Then(
  'it heads {string} as {string} and reads Live',
  async ({ page }, gateway: string, type: string) => {
    await expect(logsHeading(page, gateway)).toBeVisible();
    await expect(logsSubjectType(page, type)).toBeVisible();
    await expect(drawerHeader(page)).toContainText('Live');
  },
);

Then('the header reads Stopped', async ({ page }) => {
  await expect(drawerHeader(page)).toContainText('Stopped');
});

Then('the rows stay readable', async ({ page }) => {
  await expect(loggedRows(page)).toHaveCount(wholeStreamBefore(page));
});

Then('every row still stands', async ({ page }) => {
  await expect(loggedRows(page)).toHaveCount(wholeStreamBefore(page));
});
