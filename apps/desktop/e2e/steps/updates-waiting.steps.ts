import { expect } from '@playwright/test';

import { Given, test, Then, When } from '../fixtures';
import { versionAboveThisBuild, versionThisBuildRuns } from '../newer-version';

const CARD = 'Update ready';

const onlyWhereDownloadsRun = (): void => {
  test.skip(
    process.platform === 'darwin',
    'Squirrel.Mac hands the download to the native updater, which takes only signed builds',
  );
};

When('the newer version finishes downloading', async ({ page }) => {
  onlyWhereDownloadsRun();
  await page.getByText('Get started').waitFor();
});

When('the newer version is still downloading', async ({ page, updateFeed }) => {
  onlyWhereDownloadsRun();
  await page.getByText('Get started').waitFor();
  await expect.poll(() => updateFeed.artifactDownloads()).toBeGreaterThan(0);
});

Given('the newer version finished downloading', async ({ page }) => {
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

Then('the update card names the newer version', async ({ page }) => {
  await expect(page.getByRole('region', { name: CARD })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(`${versionThisBuildRuns} → ${versionAboveThisBuild}`)).toBeVisible();
});

Then('the update card still names the newer version', async ({ page }) => {
  await expect(page.getByRole('region', { name: CARD })).toBeVisible();
  await expect(page.getByText(`${versionThisBuildRuns} → ${versionAboveThisBuild}`)).toBeVisible();
});

Then('the interface offers no update card', async ({ page }) => {
  await expect(page.getByRole('region', { name: CARD })).toBeHidden();
});

Then('the app installs the update and reopens on the newer version', async ({ electronApp }) => {
  await electronApp.waitForEvent('close');
});
