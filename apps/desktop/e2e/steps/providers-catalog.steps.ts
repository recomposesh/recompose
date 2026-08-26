import type { Page } from '@playwright/test';

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

/**
 * What the window chrome keeps for itself on the trailing edge, which the act stands inside of.
 *
 * @summary Windows puts its caption buttons on that edge and the shell reserves
 * `--spacing-window-caption` for them, so the act cannot reach the edge the way it does where the
 * controls sit leading. The number is read off the page rather than repeated here, so the token
 * stays the one place that says how wide the strip is.
 */
async function chromeKeepsTheTrailingEdge(page: Page): Promise<number> {
  if (process.platform !== 'win32') {
    return 0;
  }

  return page.evaluate(() =>
    Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--spacing-window-caption'),
    ),
  );
}

Then('the catalog opens over the screen, holding nine entries', async ({ page }) => {
  await expect(catalog(page)).toBeVisible();
  await expect(screenTitle(page)).toHaveText('API keys');

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
    const reserved = await chromeKeepsTheTrailingEdge(page);

    expect(stands.bottom).toBeLessThan(title.top);
    expect(stripWidth - stands.right - reserved).toBeLessThan(WIDEST_TRAILING_INSET_PX);
  },
);
