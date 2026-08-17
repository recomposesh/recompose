import { expect } from '@playwright/test';

import { chooseMenuItemAt, menuItemChecked, menuItemEnabled } from '../app-menu';
import { Given, Then, When } from '../fixtures';
import { openGateway } from '../gateway-screen';
import { openProviderScreen } from '../provider-screen';
import { rememberToggledMenuItem, toggledMenuItem } from '../scenario-memory';

Given('the person watches the gateway detail of {string}', async ({ page }, name: string) => {
  await openGateway(page, name);
});

Given('the app is on the providers screen', async ({ page }) => {
  await openProviderScreen(page, 'Subscriptions');
});

When('the person picks the sidebar toggle from the View menu', async ({ electronApp, page }) => {
  rememberToggledMenuItem(page, 'Show Sidebar');
  await chooseMenuItemAt(electronApp, ['View', 'Show Sidebar']);
});

When('the person picks the inspector toggle from the View menu', async ({ electronApp, page }) => {
  rememberToggledMenuItem(page, 'Show Inspector');
  await chooseMenuItemAt(electronApp, ['View', 'Show Inspector']);
});

When('the person hides the sidebar from its on-screen toggle', async ({ page }) => {
  rememberToggledMenuItem(page, 'Show Sidebar');
  await page.getByRole('button', { name: 'Sidebar' }).click();
});

Then('the sidebar leaves the screen', async ({ page }) => {
  const sidebar = page.getByRole('complementary', { name: 'Sidebar' });

  await expect.poll(async () => (await sidebar.boundingBox())?.width ?? 0).toBeLessThan(2);
});

Then('the menu tick reads off', async ({ electronApp, page }) => {
  await expect.poll(async () => menuItemChecked(electronApp, toggledMenuItem(page))).toBe(false);
});

Then('the menu tick reads on', async ({ electronApp, page }) => {
  await expect.poll(async () => menuItemChecked(electronApp, toggledMenuItem(page))).toBe(true);
});

Then("the View menu's sidebar tick reads off", async ({ electronApp }) => {
  await expect.poll(async () => menuItemChecked(electronApp, 'Show Sidebar')).toBe(false);
});

Then('the inspector opens', async ({ page }) => {
  await expect(page.getByRole('separator', { name: 'Inspector width' })).toBeVisible();
});

Then(
  'the View menu shows the inspector item as unavailable rather than missing',
  async ({ electronApp }) => {
    await expect
      .poll(async () => menuItemEnabled(electronApp, ['View', 'Show Inspector']))
      .toBe(false);
  },
);
