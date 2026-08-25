import { expect } from '@playwright/test';

import { chooseMenuItemAt } from '../app-menu';
import { Given, Then, When } from '../fixtures';
import { leftToExplore, setupStanding, setupSurface } from '../setup-wizard';

Given('the setup wizard standing on the welcome step', async ({ page }) => {
  await setupStanding(page);
  await expect(page.getByRole('dialog', { name: 'Welcome to recompose' })).toBeVisible();
});

Given('a profile where the person left setup to explore on their own', async ({ page }) => {
  await setupStanding(page);
  await leftToExplore(page);
});

When('the person launches recompose for the first time', async ({ page }) => {
  await expect(page.locator('body')).toBeVisible();
});

When('the app launches again', async ({ page }) => {
  await page.reload();
});

When('the person presses Escape', async ({ page }) => {
  await page.keyboard.press('Escape');
});

When('the person presses the surface behind the wizard', async ({ page }) => {
  await page.mouse.click(4, 400);
});

When('the person leaves setup to explore on their own', async ({ page }) => {
  await leftToExplore(page);
});

When('the person opens setup from the View menu', async ({ electronApp }) => {
  await chooseMenuItemAt(electronApp, ['View', 'Open Setup']);
});

Then('the setup wizard holds the whole window', async ({ page }) => {
  await expect(setupSurface(page)).toBeVisible();
});

Then('it stands on the welcome step', async ({ page }) => {
  await expect(page.getByRole('dialog', { name: 'Welcome to recompose' })).toBeVisible();
});

Then('the setup wizard still holds the whole window', async ({ page }) => {
  await expect(setupSurface(page)).toBeVisible();
});

Then('the canvas stands with no wizard over it', async ({ page }) => {
  await expect(setupSurface(page)).toHaveCount(0);
});

Then('the get-started checklist stands on the canvas', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Get started' })).toBeVisible();
});
