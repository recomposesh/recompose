import { expect } from '@playwright/test';

import { Given, Then, test, When } from '../fixtures';

Given('a copy a package tool installed from a deb', () => {
  test.skip(process.platform !== 'linux', 'a deb install exists only on Linux');
});

Given('a copy running as a Linux AppImage', ({ updateFeed }) => {
  test.skip(process.platform !== 'linux', 'an AppImage exists only on Linux');
  expect(updateFeed.origin).toContain('127.0.0.1');
});

When('version 0.4.0 reaches the release feed', ({ updateFeed }) => {
  updateFeed.serveVersion('0.4.0');
});

Then('the app runs no update check of its own', async ({ mainLog, page }) => {
  await page.getByText('Get started').waitFor();
  await expect.poll(() => mainLog.join('')).toContain('the app runs no updater of its own');
});

Then('the interface offers no update control', async ({ page }) => {
  await expect(page.getByRole('region', { name: 'Update ready' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Restart to update' })).toBeHidden();
});

Then('the app downloads version 0.4.0', async ({ page, updateFeed }) => {
  await page.getByText('Get started').waitFor();
  await expect.poll(() => updateFeed.artifactDownloads(), { timeout: 20_000 }).toBeGreaterThan(0);
});
