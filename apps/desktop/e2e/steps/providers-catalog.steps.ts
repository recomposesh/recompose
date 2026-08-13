import { expect } from '@playwright/test';

import { Then } from '../fixtures';
import {
  catalog,
  catalogEntry,
  everyEntryAnswersAPick,
  keyCatalogEntries,
  keyField,
  placementOf,
  screenTitle,
} from '../provider-screen';

const ENTRIES_AND_THE_ONE_DISMISSAL = keyCatalogEntries.length + 1;

const WIDEST_TRAILING_INSET_PX = 24;

Then('the catalog opens over the screen, holding nine entries', async ({ page }) => {
  await expect(catalog(page)).toBeVisible();
  await expect(screenTitle(page)).toHaveText('API Keys');

  for (const entry of keyCatalogEntries) {
    await expect(catalogEntry(page, entry)).toBeVisible();
  }

  await expect(catalog(page).getByRole('button')).toHaveCount(ENTRIES_AND_THE_ONE_DISMISSAL);
});

Then('every entry answers a pick', async ({ page }) => {
  for (const entry of keyCatalogEntries) {
    await expect(catalogEntry(page, entry)).not.toHaveAttribute('aria-disabled');
  }
});

Then('no entry carries a Soon badge', async ({ page }) => {
  await everyEntryAnswersAPick(page);
});

Then('the connect asks for a name and a key', async ({ page }) => {
  await expect(catalog(page).getByLabel('Name')).toBeVisible();
  await expect(keyField(page)).toBeVisible();
});

Then(
  'the connect asks for a base URL and a dialect beside the name and the key',
  async ({ page }) => {
    await expect(catalog(page).getByLabel('Name')).toBeVisible();
    await expect(catalog(page).getByLabel('Base URL')).toBeVisible();
    await expect(catalog(page).getByLabel('Dialect')).toBeVisible();
    await expect(keyField(page)).toBeVisible();
  },
);

Then(
  'the act that adds a provider stands at the trailing edge of the window strip',
  async ({ page }) => {
    const act = page.getByRole('main').getByRole('button', { name: 'Add provider' });

    await expect(act).toHaveCount(1);

    const stands = await placementOf(act);
    const title = await placementOf(screenTitle(page));
    const stripWidth = await page.evaluate(() => window.innerWidth);

    expect(stands.bottom).toBeLessThan(title.top);
    expect(stripWidth - stands.right).toBeLessThan(WIDEST_TRAILING_INSET_PX);
  },
);
