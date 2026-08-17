import { expect } from '@playwright/test';

import { chooseMenuItemAt, menuItemAccelerator } from '../app-menu';
import { Given, Then, When } from '../fixtures';
import { openGateway, seedGateway } from '../gateway-screen';
import { openUsageScreen } from '../usage-screen';

Given('the app is on the usage screen', async ({ page }) => {
  await openUsageScreen(page);
});

Given(
  'the person last looked at the gateway detail of {string}',
  async ({ page }, name: string) => {
    await seedGateway(page, name);
    await openGateway(page, name);
  },
);

Given('no gateway stands stored', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Create your first gateway' })).toBeVisible();
});

When('the person picks {word} from the View menu', async ({ electronApp }, item: string) => {
  await chooseMenuItemAt(electronApp, ['View', item]);
});

Then('the main window lands on the providers screen', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1, name: 'Subscriptions' })).toBeVisible();
});

Then(
  'Gateways, Providers, and Usage print 1, 2, and 3 under the command modifier',
  async ({ electronApp }) => {
    await expect
      .poll(async () => menuItemAccelerator(electronApp, ['View', 'Gateways']))
      .toBe('CmdOrCtrl+1');
    expect(await menuItemAccelerator(electronApp, ['View', 'Providers'])).toBe('CmdOrCtrl+2');
    expect(await menuItemAccelerator(electronApp, ['View', 'Usage'])).toBe('CmdOrCtrl+3');
  },
);

Then('a window opens on the usage screen', async ({ electronApp }) => {
  await expect.poll(() => electronApp.windows().length).toBe(1);

  const [fresh] = electronApp.windows();

  if (fresh === undefined) {
    throw new Error('no window opened on the pick');
  }

  await expect(fresh.getByRole('heading', { name: 'Usage' })).toBeVisible();
});

Then('the gateway detail of {string} stands', async ({ page }, name: string) => {
  await expect(page.getByRole('button', { name: new RegExp(name, 'i') }).first()).toBeVisible();
  await expect.poll(() => new URL(page.url()).hash).toContain(`/gateways/${name}`);
});

Then('the gateways screen shows its empty state', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Create your first gateway' })).toBeVisible();
});
