import { expect } from '@playwright/test';
import { join } from 'node:path';

import { Then } from '../fixtures';
import { accountRows, activeToolHome, catalog } from '../provider-screen';
import { documentAt } from './machine-subscriptions';

/** What a config home carries once the app has answered the questions a first run asks. */
const FIRST_RUN_ANSWERS = ['hasCompletedOnboarding', 'hasTrustDialogAccepted'] as const;

Then('the tool asks only what it needs to sign in', async ({ page }) => {
  await expect(catalog(page)).toBeHidden();
  await expect(accountRows(page)).toHaveCount(1);
});

Then('it skips the questions it asks on a first run', async ({ electronApp }) => {
  const held = await documentAt(
    join(await activeToolHome(electronApp, 'anthropic'), '.claude.json'),
  );

  for (const answered of FIRST_RUN_ANSWERS) {
    expect(held[answered]).toBe(true);
  }
});

Then(
  "the machine's own login still reads {string}",
  async ({ subscriptionTools }, address: string) => {
    expect(await subscriptionTools.machineToolReadsSignedIn('anthropic')).toBe(true);

    const identity = await documentAt(join(subscriptionTools.machineHome, '.claude.json'));

    expect(identity['oauthAccount']).toEqual(expect.objectContaining({ emailAddress: address }));
  },
);
