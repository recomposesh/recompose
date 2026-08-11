import { expect } from '@playwright/test';

import { takeUpThePortAsk } from '../canvas-gestures';
import { canvasNode, DRAFT_NODE, GATEWAY_NODE, portAskOn } from '../canvas-screen';
import { nodeStandsSelected } from '../canvas-selection';
import { Given, Then, When } from '../fixtures';
import { everyRowsCells, loggedRows, onlyRowsRemain, ROW_CELLS } from '../logs-drawer';
import { ANTHROPIC_ACCOUNT } from '../served-gateway';
import { wholeStreamBefore } from '../telemetry-memory';

Given('a draft virtual model node on the canvas', async ({ page }) => {
  await expect(portAskOn(page, GATEWAY_NODE)).toHaveCount(1);
  await takeUpThePortAsk(page, GATEWAY_NODE);
  await expect(canvasNode(page, DRAFT_NODE)).toBeVisible();
});

When('the person reads the drawer with nothing selected', async ({ page }) => {
  await expect(loggedRows(page)).toHaveCount(wholeStreamBefore(page));
});

When('the person selects the draft', async ({ page }) => {
  await nodeStandsSelected(page, DRAFT_NODE);
});

Then(
  'rows of {string} and rows of {string} list together',
  async ({ page }, first: string, second: string) => {
    const listed = (await everyRowsCells(page)).map((cells) => cells[ROW_CELLS.models] ?? '');

    expect(listed.filter((models) => models.includes(first))).not.toEqual([]);
    expect(listed.filter((models) => models.includes(second))).not.toEqual([]);
  },
);

Then('only the rows that reached {string} remain', async ({ page }, account: string) => {
  expect(account).toBe(ANTHROPIC_ACCOUNT);
  await onlyRowsRemain(page, wholeStreamBefore(page), (cells) =>
    (cells[ROW_CELLS.account] ?? '').includes(account),
  );
});

Then('those rows remain listed', async ({ page }) => {
  await expect(loggedRows(page)).toHaveCount(wholeStreamBefore(page));
});

Then('every row stays listed', async ({ page }) => {
  await expect(loggedRows(page)).toHaveCount(wholeStreamBefore(page));
});
