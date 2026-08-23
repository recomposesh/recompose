import type { Page } from '@playwright/test';

import { expect } from '@playwright/test';
import { subscriptionProductNameOf } from '@recompose/contracts';

import { Given, Then, When } from '../fixtures';
import {
  openUsageScreen,
  SEEDED_SUBSCRIPTION_ADDRESS,
  seededPlansOnDisk,
  usageDataDirOf,
  USAGE_SETTLE_MS,
} from '../usage-screen';

function quotaWindows(page: Page) {
  return page.getByRole('region', { name: 'Plan usage limits' });
}

Given(
  'a previous session burned tokens on {string} and {string} under {string}',
  async ({ electronApp }, firstPlan: string, secondPlan: string, address: string) => {
    expect(address).toBe(SEEDED_SUBSCRIPTION_ADDRESS);

    const plans = (await seededPlansOnDisk(await usageDataDirOf(electronApp))).map(
      subscriptionProductNameOf,
    );

    expect(plans).toEqual([firstPlan, secondPlan]);
  },
);

When('the person opens the usage screen', async ({ page }) => {
  await openUsageScreen(page);
});

Then(
  'the plan usage limits show a {string} card and a {string} card',
  async ({ page }, firstPlan: string, secondPlan: string) => {
    const strip = quotaWindows(page);

    await expect(strip.getByText(firstPlan, { exact: true })).toBeVisible({
      timeout: USAGE_SETTLE_MS,
    });
    await expect(strip.getByText(secondPlan, { exact: true })).toBeVisible();
  },
);

Then('both cards carry the address {string}', async ({ page }, address: string) => {
  await expect(quotaWindows(page).getByText(address, { exact: true })).toHaveCount(2);
});
