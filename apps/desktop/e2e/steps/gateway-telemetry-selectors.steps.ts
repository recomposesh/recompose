import { expect } from '@playwright/test';

import { modelNodeId } from '../canvas-screen';
import { nodeStandsSelected, theEmptyCanvasIsPressed } from '../canvas-selection';
import { Given, Then, When } from '../fixtures';
import {
  loggedRows,
  logFilter,
  logFilters,
  logsHeading,
  onlyRowsRemain,
  ROW_CELLS,
} from '../logs-drawer';
import { SERVING_GATEWAY } from '../served-gateway';
import { answersGiven, turnThrough } from '../served-traffic';
import { rememberWholeStream, wholeStreamBefore } from '../telemetry-memory';
import { rowsMatchingTheTurnsSent } from '../telemetry-standing';

/** The mutually exclusive choices printed in the log filter, in reading order. */
const LOG_FILTERS = ['All', 'Success', 'Errors'] as const;

/** The status the provider fails a request with where a scenario says only that it failed. */
const COULD_NOT_ANSWER = 500;

function namedFilter(label: string): (typeof LOG_FILTERS)[number] {
  const filter = LOG_FILTERS.find((candidate) => candidate === label);

  if (filter === undefined) {
    throw new Error(`the log filter offers no "${label}" choice`);
  }

  return filter;
}

Given('served and failed requests standing as rows', async ({ keyProbe, page }) => {
  keyProbe.refusesTurnsWith(COULD_NOT_ANSWER, 'the target could not answer');
  await turnThrough(page, 'creative');
  keyProbe.refusesTurnsWith(COULD_NOT_ANSWER, 'the target could not answer');
  await turnThrough(page, 'fast');

  rememberWholeStream(page, await rowsMatchingTheTurnsSent(page));
});

Given('failed requests through both virtual models', async ({ keyProbe, page }) => {
  keyProbe.refusesTurnsWith(COULD_NOT_ANSWER, 'the target could not answer');
  await turnThrough(page, 'creative');
  await turnThrough(page, 'fast');

  await expect(
    loggedRows(page)
      .filter({ hasText: String(COULD_NOT_ANSWER) })
      .first(),
  ).toBeVisible();

  rememberWholeStream(page, answersGiven(page).length);
});

Given('the node of {string} stands selected', async ({ page }, model: string) => {
  await nodeStandsSelected(page, modelNodeId(model));
});

Given('the {string} log filter standing selected', async ({ page }, label: string) => {
  const filter = logFilter(page, namedFilter(label));

  await filter.click();
  await expect(filter).toHaveAttribute('aria-checked', 'true');
});

When('the person chooses the {string} log filter', async ({ page }, label: string) => {
  await logFilter(page, namedFilter(label)).click();
});

When('the person clicks the empty canvas', async ({ page }) => {
  await theEmptyCanvasIsPressed(page);
});

Then('only the successful rows remain', async ({ page }) => {
  await onlyRowsRemain(page, wholeStreamBefore(page), (cells) =>
    succeeded(cells[ROW_CELLS.status] ?? ''),
  );
});

Then('only the failed rows remain', async ({ page }) => {
  await onlyRowsRemain(page, wholeStreamBefore(page), (cells) =>
    failed(cells[ROW_CELLS.status] ?? ''),
  );
});

Then('every outcome row returns', async ({ page }) => {
  await expect(loggedRows(page)).toHaveCount(wholeStreamBefore(page));
});

Then('only the failed rows through {string} remain', async ({ page }, model: string) => {
  await onlyRowsRemain(
    page,
    wholeStreamBefore(page),
    (cells) =>
      failed(cells[ROW_CELLS.status] ?? '') && (cells[ROW_CELLS.models] ?? '').includes(model),
  );
});

Then('rows of every virtual model return', async ({ page }) => {
  await expect(loggedRows(page)).toHaveCount(wholeStreamBefore(page));
});

Then('only the {string} log filter reads selected', async ({ page }, label: string) => {
  const selected = namedFilter(label);

  await expect(logFilters(page).getByRole('radio')).toHaveCount(LOG_FILTERS.length);

  for (const filter of LOG_FILTERS) {
    await expect(logFilter(page, filter)).toHaveAttribute(
      'aria-checked',
      filter === selected ? 'true' : 'false',
    );
  }
});

Then('the drawer stays open', async ({ page }) => {
  await expect(logsHeading(page, SERVING_GATEWAY)).toBeVisible();
});

/** Whether a status a row printed reads as a failure, which is the same line the surfaces draw. */
function failed(status: string): boolean {
  return Number(status) >= 400;
}

/** Whether a status belongs in the successful side of the outcome filter. */
function succeeded(status: string): boolean {
  return !failed(status);
}
