import { expect } from '@playwright/test';

import { Then } from '../fixtures';
import { catalog, everyEntryAnswersAPick, screenTitle } from '../provider-screen';

const ENTRIES_AND_THE_ONE_DISMISSAL = 9;

Then('the catalog opens over the screen, holding eight hosted catalogs', async ({ page }) => {
  await expect(catalog(page)).toBeVisible();
  await expect(screenTitle(page)).toHaveText('Aggregators');
  await expect(catalog(page).getByRole('button')).toHaveCount(ENTRIES_AND_THE_ONE_DISMISSAL);
});

Then('every hosted catalog answers a pick', async ({ page }) => {
  await everyEntryAnswersAPick(page);
});
