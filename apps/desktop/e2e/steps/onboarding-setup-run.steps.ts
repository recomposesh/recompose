import { expect } from '@playwright/test';

import { Given, Then, When } from '../fixtures';
import { setupStanding, walkedToHarnesses } from '../setup-wizard';

const CATALOG_COLUMNS = ['Subscriptions', 'API keys', 'Aggregators', 'Local runtimes'];

const HARNESS_GROUPS = ['Terminal agents', 'Desktop apps', 'Editors', 'By hand'];

Given('the setup wizard standing on the harness step', async ({ page }) => {
  await setupStanding(page);
  await walkedToHarnesses(page);
});

When('the person picks the {string} harness', async ({ page }, name: string) => {
  await page.getByRole('button', { name: new RegExp(`^${name}$`, 'u') }).click();
});

When('the person picks the {string} harness and continues', async ({ page }, name: string) => {
  await page.getByRole('button', { name: new RegExp(`^${name}$`, 'u') }).click();
  await page.getByRole('button', { name: /^Continue with/u }).click();
});

Then('the control that continues refuses', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled();
});

Then('the control that continues reads {string}', async ({ page }, reads: string) => {
  await expect(page.getByRole('button', { name: reads })).toBeEnabled();
});

Then('every heading of the connect catalog stands', async ({ page }) => {
  for (const group of HARNESS_GROUPS) {
    await expect(page.getByRole('heading', { name: group })).toBeVisible();
  }
});

Then('a tile stands for every harness the catalog holds', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Claude Code' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'curl' })).toBeVisible();
});

Then('the source step stands', async ({ page }) => {
  await expect(
    page.getByRole('dialog', { name: 'Where should your models come from?' }),
  ).toBeVisible();
});

Then('every column of the provider catalog stands', async ({ page }) => {
  for (const column of CATALOG_COLUMNS) {
    await expect(page.getByRole('heading', { name: column })).toBeVisible();
  }
});
