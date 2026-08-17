import { expect } from '@playwright/test';

import { Given, Then, When } from '../fixtures';

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
