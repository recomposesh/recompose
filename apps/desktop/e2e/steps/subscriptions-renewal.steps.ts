import type { Page } from '@playwright/test';

import { expect } from '@playwright/test';

import type { MachineProvider } from './machine-subscriptions';

import { Given, Then, When } from '../fixtures';
import { accountRows, openProviderScreen } from '../provider-screen';
import {
  appHomeHolding,
  appHomesFor,
  credentialBeforeTheAct,
  homesTheAppMade,
  statusesOf,
  turnsNeedingThatAccount,
} from '../renewal-serving';
import { SIGN_IN_WAIT_MS } from '../subscription-sign-in';
import {
  adoptWhatTheMachineHolds,
  freshExpiry,
  machineLoginIfAny,
  machineProviderFor,
  nearlySpentExpiry,
  spentExpiry,
  theMachineHolds,
  theMachineRecordStands,
} from './machine-subscriptions';

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

const toolReadingsAfresh = new WeakMap<Page, boolean>();

/** The provider whose machine login this scenario adopted, when a step arranged one. */
function providerIfAny(page: Page): MachineProvider | undefined {
  const login = machineLoginIfAny(page);

  return login === undefined ? undefined : machineProviderFor(login.provider);
}

function providerHeld(page: Page): MachineProvider {
  return providerIfAny(page) ?? SUBSCRIPTION_PROVIDER;
}

Given('its credential nears expiry', async ({ electronApp, page, subscriptionTools }) => {
  const login = machineLoginIfAny(page);

  if (login === undefined) {
    await subscriptionTools.appCredentialLapsesAt(
      await appHomeHolding(electronApp, SUBSCRIPTION_PROVIDER),
      nearlySpentExpiry(),
    );

    return;
  }

  await theMachineHolds(subscriptionTools, { ...login, expiresAt: nearlySpentExpiry() });
  await adoptWhatTheMachineHolds(page, login.provider);
});

Given('its credential has expired', async ({ page, subscriptionTools }) => {
  const login = machineLoginIfAny(page);

  if (login === undefined) {
    throw new Error('no step arranged the machine login this scenario stands past its moment');
  }

  await theMachineHolds(subscriptionTools, { ...login, expiresAt: spentExpiry() });
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
    await turnsNeedingThatAccount(page, subscriptionTools, providerHeld(page), 1);
  },
);

When('a request needs that account', async ({ $testInfo, page, subscriptionTools }) => {
  $testInfo.setTimeout(SIGN_IN_WAIT_MS + FLOWS_BESIDE_THE_ADOPTION * ONE_FLOW_MS);
  await turnsNeedingThatAccount(page, subscriptionTools, providerHeld(page), 1);
});

When('two requests need that account at once', async ({ $testInfo, page, subscriptionTools }) => {
  $testInfo.setTimeout(SIGN_IN_WAIT_MS + FLOWS_BESIDE_THE_ADOPTION * ONE_FLOW_MS);
  await turnsNeedingThatAccount(page, subscriptionTools, providerHeld(page), 2);
});

When('its credential expires', async ({ $testInfo, page, subscriptionTools }) => {
  const login = machineLoginIfAny(page);

  if (login === undefined) {
    throw new Error('no step arranged the machine login this scenario lets expire');
  }

  $testInfo.setTimeout(SIGN_IN_WAIT_MS + FLOWS_BESIDE_THE_ADOPTION * ONE_FLOW_MS);
  await theMachineRecordStands(subscriptionTools, { ...login, expiresAt: spentExpiry() });
  await turnsNeedingThatAccount(page, subscriptionTools, providerHeld(page), 1);
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
    expect(await homesTheAppMade(electronApp, providerHeld(page))).toEqual([]);
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

Then(
  'the app kept no copy of the credential anywhere of its own',
  async ({ electronApp, page, subscriptionTools }) => {
    expect(await homesTheAppMade(electronApp, providerHeld(page))).toEqual([]);

    for (const home of await appHomesFor(electronApp, providerHeld(page))) {
      await expect(subscriptionTools.appCredentialKept(home)).resolves.toBeNull();
    }
  },
);

Then('the app serves the request and asks for no sign-in', async ({ electronApp, page }) => {
  expect(statusesOf(page)).toEqual([ANSWERED]);
  expect(await homesTheAppMade(electronApp, providerHeld(page))).toEqual([]);
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
