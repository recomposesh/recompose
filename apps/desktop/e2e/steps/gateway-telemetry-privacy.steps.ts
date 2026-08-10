import type { Page } from '@playwright/test';

import { expect } from '@playwright/test';

import { Given, Then, When } from '../fixtures';
import { loggedRows, ROW_CELLS, rowCells } from '../logs-drawer';
import { turnCarryingPrompt, turnThrough } from '../served-traffic';
import { rowsMatchingTheTurnsSent } from '../telemetry-standing';

/**
 * Everything the window prints where a person can read it.
 *
 * @operation The reading comes off what is rendered rather than off the markup, so a run of words
 * nobody can see is not counted as words that appeared. That is the whole of what the privacy rule
 * promises: the surfaces read traffic shape, and no prompt or answer text reaches them.
 */
async function everythingOnScreen(page: Page): Promise<string> {
  return page.locator('body').innerText();
}

Given(
  '{string} served a request carrying the prompt {string}',
  async ({ page }, gateway: string, prompt: string) => {
    await turnCarryingPrompt(page, 'creative', prompt);
    await rowsMatchingTheTurnsSent(page);

    expect(gateway).toBe('relay');
  },
);

Given(
  'the provider refused a request with status {int} and the answer text {string}',
  async ({ keyProbe, page }, status: number, words: string) => {
    keyProbe.refusesTurnsWith(status, words);
    await turnThrough(page, 'creative');
    await rowsMatchingTheTurnsSent(page);
  },
);

When('the person reads the drawer and its rows', async ({ page }) => {
  await expect(loggedRows(page)).not.toHaveCount(0);
});

When('the person reads the failed row', async ({ page }) => {
  await expect(loggedRows(page)).not.toHaveCount(0);
});

Then('{string} appears nowhere', async ({ page }, words: string) => {
  expect(await everythingOnScreen(page)).not.toContain(words);
});

Then('the row carries status {int}', async ({ page }, status: number) => {
  const cells = await rowCells(loggedRows(page).first());

  expect(cells[ROW_CELLS.status] ?? '').toBe(String(status));
});
