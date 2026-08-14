import type { Page } from '@playwright/test';
import type { GatewayApiKey } from '@recompose/contracts';

import { expect } from '@playwright/test';

import { Given, Then, When } from '../fixtures';
import { openGatewayDrawer } from '../gateway-drawer';
import { storedGateway } from '../gateway-screen';
import { clipboardHolds, theClipboardStandsEmpty } from '../held-clipboard';

const keysHeldBefore = new WeakMap<Page, string>();

async function heldKey(page: Page, name: string): Promise<GatewayApiKey | undefined> {
  return (await storedGateway(page, name)).apiKey;
}

async function requiredKey(page: Page, name: string): Promise<GatewayApiKey> {
  const held = await heldKey(page, name);

  if (held === undefined) {
    throw new Error(`the gateway "${name}" holds no API key`);
  }

  return held;
}

async function flipTheRequirement(page: Page, name: string): Promise<void> {
  await openGatewayDrawer(page, name);
  await page.getByRole('switch', { name: 'Require an API key' }).click();
}

Given('{string} requires an API key', async ({ page }, name: string) => {
  await flipTheRequirement(page, name);
  await expect.poll(async () => (await heldKey(page, name))?.required).toBe(true);

  keysHeldBefore.set(page, (await requiredKey(page, name)).value);
});

When('a person opens the API key control of {string}', async ({ page }, name: string) => {
  await openGatewayDrawer(page, name);
});

When('a person turns on the API key of {string}', async ({ page }, name: string) => {
  await flipTheRequirement(page, name);
});

When('a person turns off the API key of {string}', async ({ page }, name: string) => {
  await flipTheRequirement(page, name);
});

When('a person copies the API key of {string}', async ({ electronApp, page }, name: string) => {
  await theClipboardStandsEmpty(electronApp);
  await openGatewayDrawer(page, name);
  await page.getByRole('button', { name: 'Copy API key' }).click();
});

When(
  'a person regenerates the API key of {string} and accepts the cost',
  async ({ page }, name: string) => {
    await openGatewayDrawer(page, name);
    await page.getByRole('button', { name: 'Regenerate' }).click();
    await page.getByRole('button', { name: 'Regenerate', exact: true }).last().click();
  },
);

When(
  'a person asks to regenerate the API key of {string} and declines',
  async ({ page }, name: string) => {
    await openGatewayDrawer(page, name);
    await page.getByRole('button', { name: 'Regenerate' }).click();
    await page.getByRole('button', { name: 'Cancel' }).click();
  },
);

Then('it reads that clients reach {string} without a key', async ({ page }, name: string) => {
  await expect(page.getByText('Clients reach this gateway without a key.')).toBeVisible();
  expect(await heldKey(page, name)).toBeUndefined();
});

Then('{string} holds a minted key', async ({ page }, name: string) => {
  await expect.poll(async () => (await heldKey(page, name))?.value).toMatch(/^rc-local-/u);
});

Then('{string} requires that key', async ({ page }, name: string) => {
  await expect.poll(async () => (await heldKey(page, name))?.required).toBe(true);
});

Then('the clipboard carries the whole key', async ({ electronApp, page }) => {
  const held = keysHeldBefore.get(page);

  await expect.poll(async () => clipboardHolds(electronApp)).toBe(held);
});

Then('{string} requires a key it never held before', async ({ page }, name: string) => {
  const before = keysHeldBefore.get(page);

  await expect.poll(async () => (await heldKey(page, name))?.value).not.toBe(before);
  expect((await requiredKey(page, name)).required).toBe(true);
});

Then('{string} requires the key it already held', async ({ page }, name: string) => {
  const before = keysHeldBefore.get(page);

  expect((await requiredKey(page, name)).value).toBe(before);
  expect((await requiredKey(page, name)).required).toBe(true);
});

Then('clients reach {string} without a key', async ({ page }, name: string) => {
  await expect.poll(async () => (await heldKey(page, name))?.required).toBe(false);
});

Then('{string} still holds the key those clients carry', async ({ page }, name: string) => {
  expect((await requiredKey(page, name)).value).toBe(keysHeldBefore.get(page));
});
