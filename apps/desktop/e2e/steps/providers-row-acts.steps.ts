import type { Locator, Page } from '@playwright/test';

import { expect } from '@playwright/test';

import { Then, When } from '../fixtures';
import { accountRow } from '../provider-screen';

/** The name the scenario's key answers to, which is how the row is found among its siblings. */
const KEY_NAME = 'build';

function rowMenu(page: Page): Locator {
  return page.getByRole('menu');
}

async function actsOnTheMenu(page: Page): Promise<string[]> {
  await expect(rowMenu(page)).toBeVisible();

  return page.getByRole('menuitem').allInnerTexts();
}

When('the person right-clicks the account row', async ({ page }) => {
  await accountRow(page, KEY_NAME).click({ button: 'right' });
});

When('the person takes {string} off the row menu', async ({ page }, label: string) => {
  await page.getByRole('menuitem', { exact: true, name: label }).click();
});

Then("the row menu reads the same acts as the row's own control", async ({ page }) => {
  const fromTheRow = await actsOnTheMenu(page);

  expect(fromTheRow.length).toBeGreaterThan(0);

  await page.keyboard.press('Escape');
  await expect(rowMenu(page)).toBeHidden();

  await accountRow(page, KEY_NAME)
    .getByRole('button', { name: `Actions for ${KEY_NAME}` })
    .click();

  expect(await actsOnTheMenu(page)).toEqual(fromTheRow);
});
