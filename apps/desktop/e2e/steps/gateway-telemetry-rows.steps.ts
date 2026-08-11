import type { Page } from '@playwright/test';

import { expect } from '@playwright/test';

import { Given, Then, When } from '../fixtures';
import { clipboardHolds, COPY_CHORD, theClipboardStandsEmpty } from '../held-clipboard';
import {
  loggedRows,
  readsInFull,
  ROW_CELLS,
  rowCells,
  rowUnderCursor,
  servedRequests,
} from '../logs-drawer';
import { ANTHROPIC_ACCOUNT, definitionsBecome, SERVING_GATEWAY } from '../served-gateway';
import { turnsThrough, turnThrough } from '../served-traffic';
import { rememberWholeStream, wholeStreamBefore } from '../telemetry-memory';
import { rowsMatchingTheTurnsSent, theDrawerStandsOpen } from '../telemetry-standing';

const TIME_OF_DAY = /^\d{2}:\d{2}:\d{2}$/u;

const A_DURATION = /^\d+\.\d+s$/u;

/** A provider model whose name runs well past the cell that prints it. */
const A_LONG_NAME = 'claude-sonnet-5-with-an-unreasonably-long-published-identifier';

/** How many rows the keyboard walk needs standing under it. */
const THREE_ROWS = 3;

/** The cells that never give way, whatever the model beside them is called. */
const THE_VITALS = [ROW_CELLS.time, ROW_CELLS.status, ROW_CELLS.duration];

/** Rebinds what the gateway serves and stands the drawer back up behind the rewrite. */
async function servedAfterRebinding(
  page: Page,
  model: string,
  providerModel: string,
): Promise<void> {
  await definitionsBecome(page, [{ model, account: ANTHROPIC_ACCOUNT, providerModel }]);
  await theDrawerStandsOpen(page);
}

async function cellsOfTheNewestRow(page: Page): Promise<string[]> {
  await expect(loggedRows(page)).not.toHaveCount(0);

  return rowCells(loggedRows(page).first());
}

Given('{string} bound to an unreachable target', ({ keyProbe }, model: string) => {
  expect(model).toBe('creative');
  keyProbe.cannotBeReached();
});

Given('rows served through {string}', async ({ page }, model: string) => {
  await turnThrough(page, model);

  rememberWholeStream(page, await rowsMatchingTheTurnsSent(page));
});

Given('{string} resolved to a provider model with a long name', async ({ page }, model: string) => {
  await servedAfterRebinding(page, model, A_LONG_NAME);
  await turnThrough(page, model);
  await rowsMatchingTheTurnsSent(page);
});

Given('three rows standing in the list', async ({ page }) => {
  await turnsThrough(page, 'creative', THREE_ROWS);
  await rowsMatchingTheTurnsSent(page);
});

Given('the row cursor standing on a row', async ({ electronApp, page }) => {
  await turnsThrough(page, 'creative', THREE_ROWS);
  await rowsMatchingTheTurnsSent(page);
  await servedRequests(page).focus();
  await page.keyboard.press('ArrowDown');

  await expect.poll(async () => rowUnderCursor(page)).not.toBeNull();
  await theClipboardStandsEmpty(electronApp);
});

When(
  '{string} serves a request through {string} resolved to the provider model {string}',
  async ({ page }, gateway: string, model: string, providerModel: string) => {
    expect(gateway).toBe(SERVING_GATEWAY);
    await servedAfterRebinding(page, model, providerModel);
    await turnThrough(page, model);
    await rowsMatchingTheTurnsSent(page);
  },
);

When(
  'the provider answers a request with status {int}',
  async ({ keyProbe, page }, status: number) => {
    keyProbe.refusesTurnsWith(status, 'the target could not answer');
    await turnThrough(page, 'creative');
    await rowsMatchingTheTurnsSent(page);
  },
);

When('{string} fails the request', async ({ page }, gateway: string) => {
  expect(gateway).toBe(SERVING_GATEWAY);
  await turnThrough(page, 'creative');
  await rowsMatchingTheTurnsSent(page);
});

When('the person removes {string} from the gateway', async ({ page }, model: string) => {
  expect(model).toBe('creative');
  await definitionsBecome(page, []);
  await theDrawerStandsOpen(page);
});

When('the person reads its row', async ({ page }) => {
  await expect(loggedRows(page)).not.toHaveCount(0);
});

When('the person steps down the list by keyboard', async ({ page }) => {
  await servedRequests(page).focus();
  await page.keyboard.press('ArrowDown');

  await expect.poll(async () => rowUnderCursor(page)).not.toBeNull();
});

When('the person copies the focused row', async ({ page }) => {
  await page.keyboard.press(COPY_CHORD);
});

Then('the row names {string} and {string}', async ({ page }, model: string, resolved: string) => {
  const cells = await cellsOfTheNewestRow(page);

  expect(cells[ROW_CELLS.models] ?? '').toContain(model);
  expect(cells[ROW_CELLS.models] ?? '').toContain(resolved);
});

Then('it names {string} and {string}', async ({ page }, provider: string, account: string) => {
  const cells = await cellsOfTheNewestRow(page);

  expect(cells[ROW_CELLS.provider] ?? '').toContain(provider);
  expect(cells[ROW_CELLS.account] ?? '').toContain(account);
});

Then(
  'it carries the time, the status {int}, and the duration',
  async ({ page }, status: number) => {
    const cells = await cellsOfTheNewestRow(page);

    expect(cells[ROW_CELLS.time] ?? '').toMatch(TIME_OF_DAY);
    expect(cells[ROW_CELLS.status] ?? '').toBe(String(status));
    expect(cells[ROW_CELLS.duration] ?? '').toMatch(A_DURATION);
  },
);

Then('the row marks the failure with status {int}', async ({ page }, status: number) => {
  const cells = await cellsOfTheNewestRow(page);

  expect(cells[ROW_CELLS.status] ?? '').toBe(String(status));
});

Then('its duration cell reads how long the failure took', async ({ page }) => {
  const cells = await cellsOfTheNewestRow(page);

  expect(cells[ROW_CELLS.duration] ?? '').toMatch(A_DURATION);
});

Then('a row carries status {int}', async ({ page }, status: number) => {
  const cells = await cellsOfTheNewestRow(page);

  expect(cells[ROW_CELLS.status] ?? '').toBe(String(status));
});

Then('its provider and account cells stand empty', async ({ page }) => {
  const cells = await cellsOfTheNewestRow(page);

  expect(cells[ROW_CELLS.provider] ?? '').toBe('');
  expect(cells[ROW_CELLS.account] ?? '').toBe('');
});

Then('the rows still name {string}', async ({ page }, model: string) => {
  await expect(loggedRows(page)).toHaveCount(wholeStreamBefore(page));

  const cells = await cellsOfTheNewestRow(page);

  expect(cells[ROW_CELLS.models] ?? '').toContain(model);
});

Then('the time, the status, and the duration read in full', async ({ page }) => {
  const row = loggedRows(page).first();
  const cells = await rowCells(row);

  expect(cells[ROW_CELLS.time] ?? '').toMatch(TIME_OF_DAY);
  expect(cells[ROW_CELLS.status] ?? '').toBe('200');
  expect(cells[ROW_CELLS.duration] ?? '').toMatch(A_DURATION);

  const cut = await Promise.all(THE_VITALS.map(async (cell) => readsInFull(row, cell)));

  expect(cut).toEqual([true, true, true]);
});

Then('the row cursor moves one row at a time', async ({ page }) => {
  const first = await rowUnderCursor(page);

  await page.keyboard.press('ArrowDown');
  await expect.poll(async () => rowUnderCursor(page)).not.toBe(first);

  const second = await rowUnderCursor(page);

  await page.keyboard.press('ArrowUp');
  await expect.poll(async () => rowUnderCursor(page)).toBe(first);

  expect(second).not.toBe(first);
});

Then("the clipboard holds that row's facts", async ({ electronApp, page }) => {
  const cursor = await rowUnderCursor(page);

  expect(cursor).not.toBeNull();

  const cells = await rowCells(servedRequests(page).locator(`[id="${cursor ?? ''}"]`));

  await expect.poll(async () => clipboardHolds(electronApp)).not.toBe('');

  const copied = await clipboardHolds(electronApp);

  expect(copied).toContain(cells[ROW_CELLS.time] ?? '');
  expect(copied).toContain(cells[ROW_CELLS.method] ?? '');
  expect(copied).toContain(cells[ROW_CELLS.status] ?? '');
});
