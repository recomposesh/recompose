import type { Page } from '@playwright/test';

import { expect } from '@playwright/test';
import { existsSync } from 'node:fs';

import type { GatewayAnswer } from '../gateway-client';
import type { MachineProvider } from './machine-subscriptions';

import { Given, Then, When } from '../fixtures';
import { sendTurn, turnUnder } from '../gateway-client';
import { gatewayAddress } from '../gateway-screen';
import { accountRows, openProviderScreen, toolHomesFolder } from '../provider-screen';
import { focusedGateway } from '../scenario-memory';
import { accountHeldAs, gatewayTargetingAKey } from '../stored-target-accounts';
import { bindingOf, seedVirtualModels } from '../stored-virtual-models';
import { SIGN_IN_WAIT_MS } from '../subscription-sign-in';
import {
  adoptWhatTheMachineHolds,
  freshExpiry,
  machineLoginIfAny,
  machineProviderFor,
  nearlySpentExpiry,
  theMachineHolds,
} from './machine-subscriptions';

/** Where a turn is asked for, which is the one path a message arrives on. */
const MESSAGES_PATH = '/v1/messages';

/** The real model every virtual model in this file names, which no scenario is about. */
const REAL_MODEL = 'claude-sonnet-5';

/** The virtual model every request in this file arrives under. */
const VIRTUAL_MODEL = 'fast';

/** What an answered turn reads as. */
const ANSWERED = 200;

/** What one stored-account flow may spend on a runner already bringing up two applications. */
const ONE_FLOW_MS = 10_000;

/** The gateway seed, the key it targets, and the definition written over them. */
const FLOWS_BESIDE_THE_ADOPTION = 3;

/** The word a lapsed account reads as wherever the app reports one. */
const LAPSED_READS = 'Signed out';

/** The provider a scenario naming no machine login is about. */
const SUBSCRIPTION_PROVIDER = 'anthropic';

const answersGiven = new WeakMap<Page, GatewayAnswer[]>();

const credentialsBeforeTheAct = new WeakMap<Page, string | null>();

const toolReadingsAfresh = new WeakMap<Page, boolean>();

function answersHeld(page: Page): GatewayAnswer[] {
  const answers = answersGiven.get(page);

  if (answers === undefined) {
    throw new Error('no step asked this account for anything');
  }

  return answers;
}

function credentialBeforeTheAct(page: Page): string | null {
  const held = credentialsBeforeTheAct.get(page);

  if (held === undefined) {
    throw new Error('no step read what the store held before the act this scenario is about');
  }

  return held;
}

/** The provider whose machine login this scenario adopted, when a step arranged one. */
function providerIfAny(page: Page): MachineProvider | undefined {
  const login = machineLoginIfAny(page);

  return login === undefined ? undefined : machineProviderFor(login.provider);
}

function providerHeld(page: Page): MachineProvider {
  return providerIfAny(page) ?? SUBSCRIPTION_PROVIDER;
}

/** Stands a gateway serving one virtual model over the subscription the scenario connected. */
async function servingThatAccount(page: Page): Promise<string> {
  await gatewayTargetingAKey(page);

  const plan = await accountHeldAs(page, 'subscription');

  await seedVirtualModels(page, focusedGateway(page), [
    bindingOf(VIRTUAL_MODEL, plan.id, REAL_MODEL),
  ]);

  return gatewayAddress(page, focusedGateway(page));
}

/** Serves one turn through the account, remembering what the store held before it went. */
async function turnsNeedingThatAccount(
  page: Page,
  tools: { machineCredential: (provider: MachineProvider) => Promise<string | null> },
  count: number,
): Promise<void> {
  const address = await servingThatAccount(page);

  credentialsBeforeTheAct.set(page, await tools.machineCredential(providerHeld(page)));

  const turns = Array.from({ length: count }, async () =>
    sendTurn(address, MESSAGES_PATH, turnUnder(VIRTUAL_MODEL)),
  );

  answersGiven.set(page, await Promise.all(turns));
}

function statusesOf(page: Page): number[] {
  return answersHeld(page).map((answer) => answer.status);
}

Given('its credential nears expiry', async ({ page, subscriptionTools }) => {
  const login = machineLoginIfAny(page);

  if (login === undefined) {
    throw new Error(
      'no seam ages a credential the app signed in itself, so no scenario can stand one near expiry',
    );
  }

  await theMachineHolds(subscriptionTools, { ...login, expiresAt: nearlySpentExpiry() });
  await adoptWhatTheMachineHolds(page, login.provider);
});

Given(
  "the provider's own tool renewed the credential since the last request",
  async ({ page, subscriptionTools }) => {
    const login = machineLoginIfAny(page);

    if (login === undefined) {
      throw new Error('no step arranged the machine login this scenario renews');
    }

    await theMachineHolds(subscriptionTools, { ...login, expiresAt: freshExpiry() });
  },
);

Given("the provider's own tool fails to renew", async ({ page, subscriptionTools }) => {
  await subscriptionTools.toolFailsToRenew(providerHeld(page));
});

Given(
  "the app served requests across the credential's expiry",
  async ({ $testInfo, page, subscriptionTools }) => {
    $testInfo.setTimeout(SIGN_IN_WAIT_MS + FLOWS_BESIDE_THE_ADOPTION * ONE_FLOW_MS);
    await turnsNeedingThatAccount(page, subscriptionTools, 1);
  },
);

When('a request needs that account', async ({ $testInfo, page, subscriptionTools }) => {
  $testInfo.setTimeout(SIGN_IN_WAIT_MS + FLOWS_BESIDE_THE_ADOPTION * ONE_FLOW_MS);
  await turnsNeedingThatAccount(page, subscriptionTools, 1);
});

When('two requests need that account at once', async ({ $testInfo, page, subscriptionTools }) => {
  $testInfo.setTimeout(SIGN_IN_WAIT_MS + FLOWS_BESIDE_THE_ADOPTION * ONE_FLOW_MS);
  await turnsNeedingThatAccount(page, subscriptionTools, 2);
});

When('its credential expires', async ({ $testInfo, page, subscriptionTools }) => {
  $testInfo.setTimeout(SIGN_IN_WAIT_MS + FLOWS_BESIDE_THE_ADOPTION * ONE_FLOW_MS);
  await turnsNeedingThatAccount(page, subscriptionTools, 1);
});

When("the maintainer opens the provider's own tool afresh", async ({ page, subscriptionTools }) => {
  toolReadingsAfresh.set(
    page,
    await subscriptionTools.machineToolReadsSignedIn(providerHeld(page)),
  );
});

Then(
  "the provider's own tool renews the credential with no window shown",
  async ({ electronApp, page, subscriptionTools }) => {
    expect(await subscriptionTools.renewalRuns(providerHeld(page))).toBe(1);
    expect(existsSync(await toolHomesFolder(electronApp, providerHeld(page)))).toBe(false);
  },
);

Then(
  'the app serves the request with what the store holds afterward',
  async ({ page, subscriptionTools }) => {
    expect(statusesOf(page)).toEqual([ANSWERED]);
    expect(await subscriptionTools.machineCredential(providerHeld(page))).not.toBe(
      credentialBeforeTheAct(page),
    );
  },
);

Then('the app serves the request and asks for no sign-in', async ({ electronApp, page }) => {
  expect(statusesOf(page)).toEqual([ANSWERED]);
  expect(existsSync(await toolHomesFolder(electronApp, providerHeld(page)))).toBe(false);
});

Then('one renewal runs', async ({ page, subscriptionTools }) => {
  expect(await subscriptionTools.renewalRuns(providerHeld(page))).toBe(1);
});

Then('the app serves both requests', ({ page }) => {
  expect(statusesOf(page)).toEqual([ANSWERED, ANSWERED]);
});

Then('that tool asks for no sign-in', ({ page }) => {
  expect(toolReadingsAfresh.get(page)).toBe(true);
});

Then('the account reports itself lapsed', async ({ page }) => {
  await page.reload();
  await openProviderScreen(page, 'Subscriptions');
  await expect(accountRows(page).first()).toContainText(LAPSED_READS);
});

Then('the credential stands as it was', async ({ page, subscriptionTools }) => {
  expect(await subscriptionTools.machineCredential(providerHeld(page))).toBe(
    credentialBeforeTheAct(page),
  );
});

Then('the app renews the credential itself', async ({ page, subscriptionTools }) => {
  expect(await subscriptionTools.renewalRuns(SUBSCRIPTION_PROVIDER)).toBe(0);
  expect(statusesOf(page)).toEqual([ANSWERED]);
});

Then('the app serves the request', ({ page }) => {
  expect(statusesOf(page)).toEqual([ANSWERED]);
});
