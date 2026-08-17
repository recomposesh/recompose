import { expect } from '@playwright/test';

import { chooseMenuItemAt, menuItemEnabled } from '../app-menu';
import { Then, When } from '../fixtures';
import { healthNameAt } from '../gateway-client';
import { gatewayAddress, gatewayRow, openGateway } from '../gateway-screen';
import { clipboardHolds } from '../held-clipboard';

const GATEWAY_REMOVAL_QUESTION =
  'The gateway stops serving, and its whole composition leaves this app.';

async function gatewayItemReads(
  app: Parameters<typeof menuItemEnabled>[0],
  label: string,
  enabled: boolean,
): Promise<void> {
  await expect.poll(async () => menuItemEnabled(app, ['Gateway', label])).toBe(enabled);
}

const GATEWAY_MENU_PICKS = [
  'Start Gateway',
  'Stop Gateway',
  'Restart Gateway',
  'Copy Base URL',
  'Delete Gateway',
] as const;

for (const item of GATEWAY_MENU_PICKS) {
  When(`the person picks ${item} from the Gateway menu`, async ({ electronApp }) => {
    await chooseMenuItemAt(electronApp, ['Gateway', item]);
  });
}

When('the person opens the gateway detail of {string}', async ({ page }, name: string) => {
  await openGateway(page, name);
});

Then('{string} starts answering', async ({ page }, name: string) => {
  await expect.poll(async () => healthNameAt(await gatewayAddress(page, name))).not.toBeNull();
});

Then("the menu's Stop Gateway and Restart Gateway items enable", async ({ electronApp }) => {
  await gatewayItemReads(electronApp, 'Stop Gateway', true);
  await gatewayItemReads(electronApp, 'Restart Gateway', true);
});

Then('the Gateway menu offers Start Gateway', async ({ electronApp }) => {
  await gatewayItemReads(electronApp, 'Start Gateway', true);
});

Then('it shows Stop Gateway and Restart Gateway as unavailable', async ({ electronApp }) => {
  await gatewayItemReads(electronApp, 'Stop Gateway', false);
  await gatewayItemReads(electronApp, 'Restart Gateway', false);
});

Then('the Gateway menu offers Stop Gateway and Restart Gateway', async ({ electronApp }) => {
  await gatewayItemReads(electronApp, 'Stop Gateway', true);
  await gatewayItemReads(electronApp, 'Restart Gateway', true);
});

Then('it shows Start Gateway as unavailable', async ({ electronApp }) => {
  await gatewayItemReads(electronApp, 'Start Gateway', false);
});

Then(
  'the clipboard holds the base URL of {string}',
  async ({ electronApp, page }, name: string) => {
    const address = await gatewayAddress(page, name);

    await expect.poll(async () => clipboardHolds(electronApp)).toBe(address);
  },
);

Then('the same confirmation the canvas offers appears', async ({ page }) => {
  await expect(page.getByText(GATEWAY_REMOVAL_QUESTION)).toBeVisible();
});

Then('nothing leaves until the person answers', async ({ page }) => {
  await expect(gatewayRow(page, 'codex')).toBeVisible();
});
