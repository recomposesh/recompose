import { expect } from '@playwright/test';

import { Given, Then, When } from '../fixtures';
import { openGatewayDrawer } from '../gateway-drawer';
import { SERVING_GATEWAY } from '../served-gateway';
import {
  breakdownSection,
  ledgerOnDisk,
  oldestBucketStart,
  openUsageScreen,
  rangeBecomes,
  requestsTileCounts,
  requestsYoungerThan,
  retentionShortenedTo,
  scopeSentence,
  SEEDED_DAY_REQUESTS,
  SEEDED_OLD_DAYS_AGO,
  usageDataDirOf,
  USAGE_SETTLE_MS,
} from '../usage-screen';
import { restartedAppFor } from './app.steps';

const DAY_MS = 86_400_000;

Given('the person watches the live hour of the usage screen', async ({ page }) => {
  await openUsageScreen(page);
  await rangeBecomes(page, '1h');
  await requestsTileCounts(page, 0);
});

Given('the person watches the usage screen', async ({ page }) => {
  await openUsageScreen(page);
  await requestsTileCounts(page, SEEDED_DAY_REQUESTS);
});

Given(
  'a previous session recorded {int} requests through {string}',
  async ({ electronApp }, requests: number, gateway: string) => {
    expect(gateway).toBe(SERVING_GATEWAY);

    const ledger = await ledgerOnDisk(await usageDataDirOf(electronApp));

    expect(requestsYoungerThan(ledger, DAY_MS, Date.now())).toBe(requests);
  },
);

Given(
  'a previous session recorded requests through {string} {int} days ago',
  async ({ electronApp }, gateway: string, daysAgo: number) => {
    expect(gateway).toBe(SERVING_GATEWAY);
    expect(daysAgo).toBe(SEEDED_OLD_DAYS_AGO);

    const ledger = await ledgerOnDisk(await usageDataDirOf(electronApp));

    expect(oldestBucketStart(ledger)).toBeLessThan(Date.now() - (daysAgo - 1) * DAY_MS);
  },
);

Given(
  'the maintainer shortened usage retention to {int} days, accepting its cost',
  async ({ page }, days: number) => {
    await retentionShortenedTo(page, days);
  },
);

When(
  'the person follows the usage summary on the gateway detail of {string}',
  async ({ page }, gateway: string) => {
    expect(gateway).toBe(SERVING_GATEWAY);
    await openGatewayDrawer(page, gateway);
    await page.getByRole('link', { name: /requests in the last 24 hours/ }).click();
  },
);

Then('the requests tile counts {int}', async ({ page }, requests: number) => {
  await requestsTileCounts(page, requests);
});

Then('the breakdown names {string}', async ({ page }, gateway: string) => {
  await expect(breakdownSection(page)).toContainText(gateway, { timeout: USAGE_SETTLE_MS });
});

Then(
  'the restarted usage screen still counts {int} requests',
  async ({ page }, requests: number) => {
    const restarted = restartedAppFor(page).page;

    await openUsageScreen(restarted);
    await requestsTileCounts(restarted, requests);
  },
);

Then('the usage screen opens scoped to {string}', async ({ page }, gateway: string) => {
  await expect(page.getByRole('heading', { name: 'Usage' })).toBeVisible();
  await expect(scopeSentence(page)).toContainText(gateway);
  await requestsTileCounts(page, SEEDED_DAY_REQUESTS);
});

Then('the ledger holds nothing older than {int} days', async ({ electronApp }, days: number) => {
  const userDataDir = await usageDataDirOf(electronApp);

  await expect
    .poll(async () => oldestBucketStart(await ledgerOnDisk(userDataDir)), {
      timeout: USAGE_SETTLE_MS,
    })
    .toBeGreaterThanOrEqual(Date.now() - days * DAY_MS);
});

Then("the newest day's figures still stand", async ({ electronApp }) => {
  const ledger = await ledgerOnDisk(await usageDataDirOf(electronApp));

  expect(requestsYoungerThan(ledger, DAY_MS, Date.now())).toBeGreaterThanOrEqual(
    SEEDED_DAY_REQUESTS,
  );
});
