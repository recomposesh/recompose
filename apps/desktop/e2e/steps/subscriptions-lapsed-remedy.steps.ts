import type { Page } from '@playwright/test';

import { expect } from '@playwright/test';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';

import type { SubscriptionTools } from '../subscription-tools';

import { Given, Then, When } from '../fixtures';
import { storedGateway } from '../gateway-screen';
import { accountRows, activeToolHome, openProviderScreen } from '../provider-screen';
import { focusedGateway } from '../scenario-memory';
import { accountHeldAs, gatewayTargetingAKey } from '../stored-target-accounts';
import { bindingOf, seedVirtualModels } from '../stored-virtual-models';
import { connectSubscription, SIGN_IN_WAIT_MS } from '../subscription-sign-in';
import { machineRecordFile } from './machine-subscriptions';

/** What one stored-account flow may spend on a runner already bringing up two applications. */
const ONE_FLOW_MS = 10_000;

/** The gateway seed, the key it targets, and the definition written over them. */
const FLOWS_BESIDE_THE_SIGN_IN = 3;

/** The real model every virtual model in this file names, which no scenario is about. */
const REAL_MODEL = 'claude-sonnet-5';

/** The virtual model a scenario stands an account's place among targets by. */
const VIRTUAL_MODEL = 'fast';

const wordsALapsedRowReads = 'Signed out';

/**
 * Takes every credential the machine and the app hold for a provider out from under them.
 *
 * @summary A credential stops working where it is kept rather than where it is read, so the way to
 * arrange one is to empty both stores the app could reach and let the next observation report it.
 */
async function everyCredentialStopsWorking(
  page: Page,
  tools: SubscriptionTools,
  electronHome: string,
  provider: string,
): Promise<void> {
  await tools.revokeKeptCredentials();
  await rm(join(electronHome, '.credentials.json'), { force: true });
  await rm(machineRecordFile(tools, provider), { force: true });
  await page.reload();
  await openProviderScreen(page, 'Subscriptions');
}

Given(
  'a connected {string} subscription whose credential stopped working',
  async ({ electronApp, page, subscriptionTools }, provider: string) => {
    await connectSubscription(page, subscriptionTools, provider);
    await everyCredentialStopsWorking(
      page,
      subscriptionTools,
      await activeToolHome(electronApp, provider),
      provider,
    );
  },
);

Given(
  "a connected {string} subscription standing among a virtual model's targets",
  async ({ $testInfo, page, subscriptionTools }, provider: string) => {
    $testInfo.setTimeout(SIGN_IN_WAIT_MS + FLOWS_BESIDE_THE_SIGN_IN * ONE_FLOW_MS);
    await gatewayTargetingAKey(page);
    await connectSubscription(page, subscriptionTools, provider);

    const plan = await accountHeldAs(page, 'subscription');

    await seedVirtualModels(page, focusedGateway(page), [
      bindingOf(VIRTUAL_MODEL, plan.id, REAL_MODEL),
    ]);
  },
);

When('its credential stops working', async ({ electronApp, page, subscriptionTools }) => {
  await everyCredentialStopsWorking(
    page,
    subscriptionTools,
    await activeToolHome(electronApp, 'anthropic'),
    'anthropic',
  );
});

Then('the row reports the lapse rather than reporting it as connected', async ({ page }) => {
  await expect(accountRows(page).first()).toContainText(wordsALapsedRowReads);
  await expect(accountRows(page).first()).not.toContainText('Connected');
});

Then('the row offers to sign the account in again', async ({ page }) => {
  await expect(
    accountRows(page).first().getByRole('button', { name: 'Sign in again' }),
  ).toBeVisible();
});

Then("the row names the provider's own tool to open", async ({ page }) => {
  await expect(accountRows(page).first()).toContainText('Open Claude to sign in again');
});

Then('the row offers no sign-in', async ({ page }) => {
  const row = accountRows(page).first();

  await expect(row.getByRole('button', { name: 'Sign in again' })).toBeHidden();
  await row.getByRole('button', { name: /^Actions for/u }).click();
  await expect(page.getByRole('menuitem', { name: 'Sign in again' })).toBeHidden();
  await page.keyboard.press('Escape');
});

Then('each row reports where its account came from', async ({ page }) => {
  await expect(accountRows(page).filter({ hasText: 'Claude' })).toContainText('from this machine');
  await expect(accountRows(page).filter({ hasText: 'Codex' })).not.toContainText(
    'from this machine',
  );
});

Then("the account keeps its place among the virtual model's targets", async ({ page }) => {
  const plan = await accountHeldAs(page, 'subscription');
  const held = await storedGateway(page, focusedGateway(page));
  const bound = held.virtualModels.find((model) => model.id === VIRTUAL_MODEL);

  expect(bound?.target.accountId).toBe(plan.id);
});
