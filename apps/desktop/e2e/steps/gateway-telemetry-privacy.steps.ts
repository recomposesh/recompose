import type { Page } from '@playwright/test';

import { expect } from '@playwright/test';

import { Given, Then, When } from '../fixtures';
import { loggedRows, requestDetail, theCursorWalksOntoARequest } from '../logs-drawer';
import { turnCarryingPrompt } from '../served-traffic';
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
  'the provider refused the prompt {string} with status {int}, saying {string}',
  async ({ keyProbe, page }, prompt: string, status: number, words: string) => {
    keyProbe.refusesTurnsWith(status, words);
    await turnCarryingPrompt(page, 'creative', prompt);
    await rowsMatchingTheTurnsSent(page);
  },
);

When('the person reads the drawer and its rows', async ({ page }) => {
  await expect(loggedRows(page)).not.toHaveCount(0);
});

When('the person reads the failed request beside the run', async ({ page }) => {
  await expect(loggedRows(page)).not.toHaveCount(0);
  await theCursorWalksOntoARequest(page);
});

Then('the reading quotes {string}', async ({ page }, words: string) => {
  await expect(requestDetail(page)).toContainText(words);
});

Then('{string} appears nowhere', async ({ page }, words: string) => {
  expect(await everythingOnScreen(page)).not.toContain(words);
});
