import { expect } from '@playwright/test';

import { Then } from '../fixtures';
import { catalog, everyEntryAnswersAPick, screenTitle } from '../provider-screen';

const ENTRIES_AND_THE_ONE_DISMISSAL = 6;

Then('the catalog opens over the screen, holding five servers', async ({ page }) => {
  await expect(catalog(page)).toBeVisible();
  await expect(screenTitle(page)).toHaveText('Local runtimes');
  await expect(catalog(page).getByRole('button')).toHaveCount(ENTRIES_AND_THE_ONE_DISMISSAL);
});

Then('every server answers a pick', async ({ page }) => {
  await everyEntryAnswersAPick(page);
});

Then('the look reports what stands at {string}', async ({ page }, host: string) => {
  await expect(catalog(page).getByRole('status')).toContainText(host);
});

Then('the connect asks for a name and a port', async ({ page }) => {
  await expect(catalog(page).getByLabel('Name')).toBeVisible();
  await expect(catalog(page).getByLabel('Port')).toBeVisible();
});

Then('it never asks for a host', async ({ page }) => {
  await expect(catalog(page).getByLabel('Host')).toBeHidden();
  await expect(catalog(page).getByLabel('Base URL')).toBeHidden();
});
