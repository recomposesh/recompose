import { expect } from '@playwright/test';

import { modelNodeId } from '../canvas-screen';
import {
  anyNodeStandsSelected,
  nodeCard,
  nodeStandsSelected,
  theEmptyCanvasIsPressed,
} from '../canvas-selection';
import { Given, Then, When } from '../fixtures';
import {
  everyRowsCells,
  loggedRows,
  logScope,
  logScopes,
  logsHeading,
  onlyRowsRemain,
  ROW_CELLS,
  scopeOverflow,
} from '../logs-drawer';
import { ANTHROPIC_ACCOUNT, definitionsBecome, SERVING_GATEWAY } from '../served-gateway';
import { answersGiven, turnThrough } from '../served-traffic';
import { rememberWholeStream, wholeStreamBefore } from '../telemetry-memory';
import { rowsMatchingTheTurnsSent, theDrawerStandsOpen } from '../telemetry-standing';

/** What the whole-gateway scope reads, which is the scope a person starts on. */
const ALL = 'All';

/** The status the provider fails a request with where a scenario says only that it failed. */
const COULD_NOT_ANSWER = 500;

/** Eight names, which is more than the strip keeps in reach at once. */
const EIGHT_MODELS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'] as const;

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

Given('{string} serving eight virtual models', async ({ page }, gateway: string) => {
  expect(gateway).toBe(SERVING_GATEWAY);
  await definitionsBecome(
    page,
    EIGHT_MODELS.map((model) => ({ model, account: ANTHROPIC_ACCOUNT })),
  );
  await theDrawerStandsOpen(page);
});

When('the person presses the {string} scope', async ({ page }, model: string) => {
  await logScope(page, model).click();
});

When('the person selects the node of {string} on the canvas', async ({ page }, model: string) => {
  await nodeStandsSelected(page, modelNodeId(model));
});

When('the person presses All', async ({ page }) => {
  await logScope(page, ALL).click();
});

When('the person clicks the empty canvas', async ({ page }) => {
  await theEmptyCanvasIsPressed(page);
});

When("the person opens the strip's overflow", async ({ page }) => {
  await scopeOverflow(page).click();
  await expect(page.getByRole('menu')).toBeVisible();
});

Then('the canvas selects the node of {string}', async ({ page }, model: string) => {
  await expect(nodeCard(page, modelNodeId(model))).toHaveAttribute('aria-pressed', 'true');
});

Then('the {string} scope reads selected', async ({ page }, model: string) => {
  await expect(logScope(page, model)).toHaveAttribute('aria-checked', 'true');
});

Then('rows of every virtual model return', async ({ page }) => {
  await expect(loggedRows(page)).toHaveCount(wholeStreamBefore(page));
});

Then('the canvas selection clears', async ({ page }) => {
  await expect.poll(async () => anyNodeStandsSelected(page)).toBe(false);
});

Then('only the failed rows remain', async ({ page }) => {
  await onlyRowsRemain(page, wholeStreamBefore(page), (cells) =>
    failed(cells[ROW_CELLS.status] ?? ''),
  );
});

Then('only the failed rows through {string} remain', async ({ page }, model: string) => {
  const listed = await everyRowsCells(page);

  expect(listed).not.toEqual([]);
  expect(
    listed.filter(
      (cells) =>
        !failed(cells[ROW_CELLS.status] ?? '') || !(cells[ROW_CELLS.models] ?? '').includes(model),
    ),
  ).toEqual([]);
});

Then('the scope returns to All', async ({ page }) => {
  await expect(logScope(page, ALL)).toHaveAttribute('aria-checked', 'true');
});

Then('the drawer stays open', async ({ page }) => {
  await expect(logsHeading(page, SERVING_GATEWAY)).toBeVisible();
});

Then("a scope carrying the target's name appears selected", async ({ page }) => {
  await expect(logScope(page, ANTHROPIC_ACCOUNT)).toHaveAttribute('aria-checked', 'true');
});

Then('a transient scope reads Removed', async ({ page }) => {
  await expect(logScope(page, 'Removed')).toHaveAttribute('aria-checked', 'true');
});

Then('every virtual model stands listed', async ({ page }) => {
  const inReach = await logScopes(page).allInnerTexts();
  const behind = await page.getByRole('menuitem').allInnerTexts();
  const reachable = new Set([...inReach, ...behind].map((label) => label.trim()));

  expect(EIGHT_MODELS.filter((model) => !reachable.has(model))).toEqual([]);
});

/** Whether a status a row printed reads as a failure, which is the same line the surfaces draw. */
function failed(status: string): boolean {
  return Number(status) >= 400;
}
