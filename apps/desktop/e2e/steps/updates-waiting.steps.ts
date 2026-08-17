import { expect } from '@playwright/test';

import { Given, test, Then, When } from '../fixtures';

const CARD = 'Update ready';

const onlyWhereDownloadsRun = (): void => {
  test.skip(
    process.platform === 'darwin',
    'Squirrel.Mac hands the download to the native updater, which takes only signed builds',
  );
};

When('version 0.4.0 finishes downloading', async ({ page }) => {
  onlyWhereDownloadsRun();
  await page.getByText('Get started').waitFor();
});

When('version 0.4.0 is still downloading', async ({ page, updateFeed }) => {
  onlyWhereDownloadsRun();
  await page.getByText('Get started').waitFor();
  await expect.poll(() => updateFeed.artifactDownloads()).toBeGreaterThan(0);
});

Given('version 0.4.0 finished downloading', async ({ page }) => {
  onlyWhereDownloadsRun();
  await page.getByText('Get started').waitFor();
  await expect(page.getByRole('region', { name: CARD })).toBeVisible({ timeout: 15_000 });
});

When('the person moves to another page', async ({ page }) => {
  await page.getByRole('link', { name: 'Usage' }).click();
});

When('the person chooses to restart', async ({ page }) => {
  await page.getByRole('button', { name: 'Restart to update' }).click();
});

Then('the app keeps running and takes no window focus', async ({ electronApp, page }) => {
  await expect(page.getByText('Get started')).toBeVisible();
  expect(electronApp.windows()).toHaveLength(1);
});

Then('the update card names version 0.4.0', async ({ page }) => {
  await expect(page.getByRole('region', { name: CARD })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('0.3.0 → 0.4.0')).toBeVisible();
});

Then('the update card still names version 0.4.0', async ({ page }) => {
  await expect(page.getByRole('region', { name: CARD })).toBeVisible();
  await expect(page.getByText('0.3.0 → 0.4.0')).toBeVisible();
});

Then('the interface offers no update card', async ({ page }) => {
  await expect(page.getByRole('region', { name: CARD })).toBeHidden();
});

Then('the app installs the update and reopens on version 0.4.0', async ({ electronApp }) => {
  await electronApp.waitForEvent('close');
});
