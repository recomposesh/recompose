import type { Page } from '@playwright/test';

import { expect } from '@playwright/test';
import { rm } from 'node:fs/promises';

import { Given, test, Then, When } from '../fixtures';
import { catalog, openProviderWays, toolNameFor } from '../provider-screen';
import { focusedProvider, focusProvider } from '../scenario-memory';
import {
  adoptAct,
  anEmptyMachineReads,
  freshExpiry,
  MACHINE_ADDRESS,
  machineLoginHeld,
  machineRecordFile,
  signInAct,
  spentExpiry,
  theMachineHolds,
  theMachineHoldsFor,
  theMachineHoldsNoLogin,
} from './machine-subscriptions';

/** What the catalog says when the operating system would not open the store it looked in. */
const STORE_REFUSED_READS = 'macOS did not allow access to the login keychain.';

/** The word a lapsed account reads as wherever the app reports one. */
const LAPSED_READS = 'Signed out';

/** The address the older of two disagreeing records signed in as. */
const STALE_ADDRESS = 'stale@example.com';

/** The address the fresher of two disagreeing records signed in as. */
const FRESHER_ADDRESS = 'fresher@example.com';

const opensBeforeTheSecondLook = new WeakMap<Page, number>();

Given(
  'the {string} tool never signed in on this machine',
  async ({ subscriptionTools }, provider: string) => {
    await theMachineHoldsNoLogin(subscriptionTools, provider);
  },
);

/**
 * @summary Only macOS keeps a vendor credential outside the config home, so a machine without one
 * has no second store for these scenarios to stand a record in. Every other machine reads the file,
 * which the scenarios beside these already cover.
 */
function onlyWhereACredentialStoreStands(): void {
  test.skip(
    process.platform !== 'darwin',
    'this machine keeps vendor credentials in files, so it holds no credential store to open',
  );
}

Given(
  'the operating system refuses to open the credential store',
  async ({ page, subscriptionTools }) => {
    onlyWhereACredentialStoreStands();

    await theMachineHoldsFor(page, subscriptionTools, { provider: 'anthropic' });
    await subscriptionTools.keychainRefusesToOpen();
  },
);

Given(
  'the machine holds an {string} record that carries no account credential',
  async ({ page, subscriptionTools }, provider: string) => {
    await theMachineHoldsFor(page, subscriptionTools, {
      provider,
      carriesAccountCredential: false,
    });
  },
);

Given(
  'the {string} tool holds a key on this machine rather than a subscription',
  async ({ page, subscriptionTools }, provider: string) => {
    await theMachineHoldsFor(page, subscriptionTools, {
      provider,
      carriesAccountCredential: false,
    });
  },
);

Given(
  'the {string} tool signed in on this machine',
  async ({ page, subscriptionTools }, provider: string) => {
    await theMachineHoldsFor(page, subscriptionTools, { provider });
  },
);

Given('the credential it left has since lapsed', async ({ page, subscriptionTools }) => {
  await theMachineHoldsFor(page, subscriptionTools, {
    ...machineLoginHeld(page),
    expiresAt: spentExpiry(),
  });
});

Given(
  'the machine holds the {string} account in two stores that disagree',
  async ({ page, subscriptionTools }, provider: string) => {
    onlyWhereACredentialStoreStands();

    await theMachineHolds(subscriptionTools, {
      provider,
      signedInAs: STALE_ADDRESS,
      expiresAt: spentExpiry(),
      store: 'file',
    });
    await theMachineHoldsFor(page, subscriptionTools, {
      provider,
      signedInAs: FRESHER_ADDRESS,
      expiresAt: freshExpiry(),
      store: 'keychain',
    });
  },
);

Given(
  'it keeps its credential in the operating system keyring rather than the file',
  async ({ page, subscriptionTools }) => {
    onlyWhereACredentialStoreStands();

    const login = machineLoginHeld(page);

    await rm(machineRecordFile(subscriptionTools, login.provider), { force: true });
    await theMachineHoldsFor(page, subscriptionTools, { ...login, store: 'keychain' });
  },
);

Given(
  'the operating system asks before the credential store opens',
  async ({ page, subscriptionTools }) => {
    onlyWhereACredentialStoreStands();

    await theMachineHoldsFor(page, subscriptionTools, { provider: 'anthropic', store: 'keychain' });
  },
);

Given(
  'the maintainer saw what the machine holds for {string} once',
  async ({ page, subscriptionTools }, provider: string) => {
    focusProvider(page, provider);
    await openProviderWays(page, provider);
    await expect(adoptAct(page)).toBeVisible();

    opensBeforeTheSecondLook.set(page, await subscriptionTools.keychainOpens());
  },
);

When('the maintainer picks {string} a second time', async ({ page }, provider: string) => {
  focusProvider(page, provider);
  await catalog(page).getByRole('button', { name: 'Back' }).click();
  await openProviderWays(page, provider);
  await expect(adoptAct(page)).toBeVisible();
});

Then('the catalog offers the sign-in and says the machine holds nothing', async ({ page }) => {
  const provider = focusedProvider(page);

  await expect(catalog(page)).toContainText(anEmptyMachineReads(toolNameFor(provider)));
  await expect(signInAct(page, provider)).toBeEnabled();
});

Then("the catalog says it couldn't read the store", async ({ page }) => {
  await expect(catalog(page)).toContainText(STORE_REFUSED_READS);
});

Then('it does not claim the machine holds nothing', async ({ page }) => {
  await expect(catalog(page)).not.toContainText(
    anEmptyMachineReads(toolNameFor(focusedProvider(page))),
  );
});

Then('it offers a way to try again', async ({ page }) => {
  await expect(catalog(page).getByRole('button', { name: 'Check again' })).toBeEnabled();
});

Then('the catalog offers nothing to adopt', async ({ page }) => {
  await expect(catalog(page)).toBeVisible();
  await expect(adoptAct(page)).toBeHidden();
});

Then('the catalog names the account it found and reports the lapse', async ({ page }) => {
  await expect(catalog(page)).toContainText(MACHINE_ADDRESS);
  await expect(catalog(page)).toContainText(LAPSED_READS);
});

Then('the catalog offers the account from the fresher store', async ({ page }) => {
  await expect(catalog(page)).toContainText(FRESHER_ADDRESS);
  await expect(catalog(page)).not.toContainText(STALE_ADDRESS);
});

Then('no new permission prompt appears', async ({ page, subscriptionTools }) => {
  const before = opensBeforeTheSecondLook.get(page);

  if (before === undefined) {
    throw new Error('no step read what the store had been asked before this second look');
  }

  expect(await subscriptionTools.keychainOpens()).toBe(before);
});
