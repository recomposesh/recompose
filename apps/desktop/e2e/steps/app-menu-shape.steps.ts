import { expect } from '@playwright/test';

import { menuBarShape, menuItemEnabled } from '../app-menu';
import { Then, When } from '../fixtures';
import { openProviderScreen } from '../provider-screen';
import { openUsageScreen } from '../usage-screen';

const CHECKLIST_ITEM = 'Show Onboarding Checklist';

Then('the menu bar ends with Window and then Help', async ({ electronApp }) => {
  await expect
    .poll(async () => (await menuBarShape(electronApp)).slice(-2))
    .toEqual(['Window', 'Help']);
});

When('the person visits the usage screen and then the providers screen', async ({ page }) => {
  await openUsageScreen(page);
  await openProviderScreen(page, 'API keys');
});

Then('the menu bar still ends with a Help menu', async ({ electronApp }) => {
  await expect.poll(async () => (await menuBarShape(electronApp)).at(-1)).toBe('Help');
});

Then('the View menu carries the onboarding checklist item', async ({ electronApp }) => {
  await expect.poll(async () => menuItemEnabled(electronApp, ['View', CHECKLIST_ITEM])).toBe(true);
});

Then('no other menu carries it', async ({ electronApp }) => {
  const otherMenus = (await menuBarShape(electronApp)).filter((label) => label !== 'View');

  for (const menu of otherMenus) {
    expect(await menuItemEnabled(electronApp, [menu, CHECKLIST_ITEM])).toBeNull();
  }
});
