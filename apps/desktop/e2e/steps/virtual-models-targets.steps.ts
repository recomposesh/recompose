import type { Page } from '@playwright/test';
import type { VirtualModel } from '@recompose/contracts';

import { expect } from '@playwright/test';

import {
  accountPicker,
  DRAFT_NODE,
  GATEWAY_NODE,
  openGatewayCanvas,
  plusOn,
} from '../canvas-screen';
import { Given, Then, When } from '../fixtures';
import { openGatewayDrawer, servedRow } from '../gateway-drawer';
import { focusedGateway } from '../scenario-memory';
import {
  accountHeldAs,
  AGGREGATOR_ACCOUNT,
  everyOfferedKindStandsStored,
  gatewayTargetingAKey,
  KEY_ACCOUNT,
  LOCAL_RUNTIME,
} from '../stored-target-accounts';
import { bindingOf, offerVirtualModels, type StoreOutcome } from '../stored-virtual-models';
import { connectSubscription, SIGN_IN_WAIT_MS } from '../subscription-sign-in';

const SUBSCRIPTION_PROVIDER = 'anthropic';

/** What one stored-account flow may spend on a runner already bringing up two applications. */
const ONE_FLOW_MS = 10_000;

/**
 * What an arrangement walking a sign-in and some flows beside it may spend.
 *
 * @summary The default ceiling is sized for a scenario that arranges one thing, and this file
 * arranges up to five. Two applications launch at once by design, so a loaded runner stretches
 * every flow at once rather than one of them. The budget is derived from what the arrangement
 * contains rather than raised until the arithmetic works: the sign-in's own allowance, which is
 * the only wait long enough to decide the outcome, plus room for each flow standing beside it. A
 * ceiling below that sum would always fire first and report nothing a person could act on.
 */
function budgetFor(flowsBesideTheSignIn: number): number {
  return SIGN_IN_WAIT_MS + flowsBesideTheSignIn * ONE_FLOW_MS;
}

/** The gateway seed, the key, the aggregator, and the local runtime. */
const FLOWS_BESIDE_THE_FOUR_KIND_SIGN_IN = 4;

/** The gateway seed and the key. */
const FLOWS_BESIDE_THE_STORED_DEFINITION_SIGN_IN = 2;

/** The subscription, the key, the aggregator, and the local runtime. */
const ACCOUNTS_THE_PICKER_OFFERS = 4;

const definitions = new WeakMap<Page, VirtualModel[]>();

const outcomes = new WeakMap<Page, StoreOutcome>();

function definitionHeld(page: Page): VirtualModel[] {
  const held = definitions.get(page);

  if (held === undefined) {
    throw new Error('no step wrote the definition this scenario is about');
  }

  return held;
}

function outcomeHeld(page: Page): StoreOutcome {
  const outcome = outcomes.get(page);

  if (outcome === undefined) {
    throw new Error('no step offered a definition this scenario could read an answer from');
  }

  return outcome;
}

Given(
  'a gateway and a stored subscription, key, aggregator, and local account',
  async ({ $testInfo, page, subscriptionTools }) => {
    $testInfo.setTimeout(budgetFor(FLOWS_BESIDE_THE_FOUR_KIND_SIGN_IN));
    await gatewayTargetingAKey(page);
    await connectSubscription(page, subscriptionTools, SUBSCRIPTION_PROVIDER);
    await everyOfferedKindStandsStored(page);
  },
);

Given(
  'a stored virtual model {string} whose target names a subscription account',
  async ({ $testInfo, page, subscriptionTools }, name: string) => {
    $testInfo.setTimeout(budgetFor(FLOWS_BESIDE_THE_STORED_DEFINITION_SIGN_IN));
    await gatewayTargetingAKey(page);
    await connectSubscription(page, subscriptionTools, SUBSCRIPTION_PROVIDER);

    const plan = await accountHeldAs(page, 'subscription');

    definitions.set(page, [bindingOf(name, plan.id, 'claude-sonnet-5')]);
  },
);

When('the person opens the target picker for a new virtual model', async ({ page }) => {
  await openGatewayCanvas(page, focusedGateway(page));
  await plusOn(page, GATEWAY_NODE).click();
  await plusOn(page, DRAFT_NODE).click();
  await expect(accountPicker(page)).toBeVisible();
});

When('the gateway config loads', async ({ page }) => {
  outcomes.set(page, await offerVirtualModels(page, focusedGateway(page), definitionHeld(page)));
});

Then(
  'the picker lists the subscription, the key, the aggregator, and the local account',
  async ({ page }) => {
    const plan = await accountHeldAs(page, 'subscription');
    const picker = accountPicker(page);

    await expect(picker.getByText('Subscriptions', { exact: true })).toBeVisible();
    await expect(picker.getByText('API Keys', { exact: true })).toBeVisible();
    await expect(picker.getByText('Aggregators', { exact: true })).toBeVisible();
    await expect(picker.getByText('Local Runtimes', { exact: true })).toBeVisible();
    await expect(picker.getByRole('button', { name: plan.label })).toBeVisible();
    await expect(picker.getByRole('button', { name: KEY_ACCOUNT })).toBeVisible();
    await expect(picker.getByRole('button', { name: AGGREGATOR_ACCOUNT })).toBeVisible();
    await expect(picker.getByRole('button', { name: LOCAL_RUNTIME })).toBeVisible();
    await expect(picker.getByRole('listitem')).toHaveCount(ACCOUNTS_THE_PICKER_OFFERS);
  },
);

Then('the drawer reads {string} over the subscription account', async ({ page }, name: string) => {
  const landed = outcomeHeld(page);

  if (!landed.ok) {
    throw new Error(`the app refused the subscription-target definition: ${landed.message}`);
  }

  const plan = await accountHeldAs(page, 'subscription');

  await page.reload();
  await openGatewayDrawer(page, focusedGateway(page));
  await expect(
    servedRow(page, focusedGateway(page), name).filter({ hasText: plan.label }),
  ).toBeVisible();
});
