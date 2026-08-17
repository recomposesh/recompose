import type { ElectronApplication } from '@playwright/test';

import { expect } from '@playwright/test';

import { chooseMenuItemAt, menuItemChecked } from '../app-menu';
import { Given, Then, When } from '../fixtures';
import { rememberToggledMenuItem } from '../scenario-memory';

async function metricSubmenuLabels(app: ElectronApplication): Promise<string[]> {
  return app.evaluate(({ Menu }) => {
    type MenuItems = NonNullable<ReturnType<typeof Menu.getApplicationMenu>>['items'];

    const submenuNamed = (items: MenuItems, label: string): MenuItems => {
      const found = items.find((item) => item.label === label);

      return found?.submenu?.items ?? [];
    };

    const bar: MenuItems = Menu.getApplicationMenu()?.items ?? [];

    return submenuNamed(submenuNamed(bar, 'Usage'), 'Metric').map((item) => item.label);
  });
}

When(
  'the person picks {string} from the Metric submenu of the Usage menu',
  async ({ electronApp }, metric: string) => {
    await chooseMenuItemAt(electronApp, ['Usage', 'Metric', metric]);
  },
);

Then(
  'the Metric submenu names Requests, Latency, Tokens, and Spend and nothing else',
  async ({ electronApp }) => {
    await expect
      .poll(async () => metricSubmenuLabels(electronApp))
      .toEqual(['Requests', 'Latency', 'Tokens', 'Spend']);
  },
);

Given('the data table twin stands open', async ({ electronApp, page }) => {
  rememberToggledMenuItem(page, 'Show Data Table');
  await chooseMenuItemAt(electronApp, ['Usage', 'Show Data Table']);
  await expect(page.getByRole('table')).toBeVisible();
});

Then('the data table twin opens', async ({ page }) => {
  await expect(page.getByRole('table')).toBeVisible();
});

Then('the data table twin leaves the screen', async ({ page }) => {
  await expect(page.getByRole('table')).toBeHidden();
});

Then("the Usage menu's data table tick reads off", async ({ electronApp }) => {
  await expect.poll(async () => menuItemChecked(electronApp, 'Show Data Table')).toBe(false);
});
