import { expect } from '@playwright/test';

import { menuItemAccelerator } from '../app-menu';
import { Given, Then } from '../fixtures';
import { SERVING_GATEWAY } from '../served-gateway';
import { turnThrough } from '../served-traffic';
import { requestsTileCounts, SEEDED_DAY_REQUESTS } from '../usage-screen';

Given(
  '{string} served a request through {string} that the figures do not yet count',
  async ({ page }, gateway: string, model: string) => {
    expect(gateway).toBe(SERVING_GATEWAY);
    await turnThrough(page, model);
  },
);

Then('the requests tile counts the new request', async ({ page }) => {
  await requestsTileCounts(page, SEEDED_DAY_REQUESTS + 1);
});

Then('the explorer keeps its place on the last 7 days', async ({ page }) => {
  await expect(
    page.getByRole('radiogroup', { name: 'Range' }).getByRole('radio', { name: '7d' }),
  ).toBeChecked();
});

Then(
  "Refresh Usage prints a shortcut the View menu's reload row does not claim",
  async ({ electronApp }) => {
    const chord = await menuItemAccelerator(electronApp, ['Usage', 'Refresh Usage']);

    expect(chord).toBe('Alt+CmdOrCtrl+R');
    expect(chord).not.toBe('CmdOrCtrl+Shift+R');
  },
);
