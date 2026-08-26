import { expect } from '@playwright/test';

import { chooseMenuItemAt } from '../app-menu';
import { Given, Then, When } from '../fixtures';
import { versionThisBuildRuns } from '../newer-version';

const NOTICE = 'Update check';

function updateCheckMenuPath(): readonly string[] {
  return process.platform === 'darwin'
    ? ['Recompose', 'Check for Updates…']
    : ['Help', 'Check for Updates…'];
}

Given('the app runs on a channel it updates itself', ({ updateFeed }) => {
  expect(updateFeed.origin).toContain('127.0.0.1');
});

Given('the release feed answers with an error', ({ updateFeed }) => {
  expect(updateFeed.refusingChecks()).toBe(true);
});

When('the app checks for an update', async ({ page, updateFeed }) => {
  await page.getByText('Get started').waitFor();
  await expect.poll(() => updateFeed.checksAnswered()).toBeGreaterThan(0);
});

When('the app starts', async ({ page }) => {
  await page.getByText('Get started').waitFor();
});

When('the person checks for updates', async ({ electronApp, page }) => {
  await page.getByText('Get started').waitFor();
  await chooseMenuItemAt(electronApp, updateCheckMenuPath());
});

Then('the app keeps running and raises no dialog', async ({ electronApp, page }) => {
  await expect(page.getByText('Get started')).toBeVisible();
  expect(electronApp.windows()).toHaveLength(1);
});

Then('the log carries the reason and the feed address', async ({ mainLog, updateFeed }) => {
  await expect.poll(() => mainLog.join('')).toContain('update check failed:');
  expect(mainLog.join('')).toContain('(feed: dev-app-update.yml)');
  expect(mainLog.join('')).toContain(updateFeed.origin);
});

Then('it checks the release feed once', async ({ updateFeed }) => {
  await expect.poll(() => updateFeed.checksAnswered()).toBe(1);
});

Then('the app reports the running version is the newest', async ({ page }) => {
  const notice = page.getByRole('region', { name: NOTICE });

  await expect(notice).toContainText('Up to date', { timeout: 15_000 });
  await expect(notice).toContainText(`Recompose ${versionThisBuildRuns} is the newest version.`);
});

Then('the app reports the check failed and names the reason', async ({ page }) => {
  const notice = page.getByRole('region', { name: NOTICE });

  await expect(notice).toContainText('Update check failed', { timeout: 15_000 });
  await expect(notice).toContainText('500');
});

Given('the app has run past its launch check', async ({ updateFeed }) => {
  await expect.poll(() => updateFeed.checksAnswered()).toBeGreaterThan(0);
});

When('the check interval elapses', async ({ page, updateFeed }) => {
  await page.getByText('Get started').waitFor();
  await expect.poll(() => updateFeed.checksAnswered()).toBeGreaterThan(0);
});

Then('it checks the release feed again', async ({ updateFeed }) => {
  await expect.poll(() => updateFeed.checksAnswered(), { timeout: 15_000 }).toBeGreaterThan(1);
});
