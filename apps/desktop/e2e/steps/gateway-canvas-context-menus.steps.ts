import type { Locator, Page } from '@playwright/test';

import { expect } from '@playwright/test';

import { canvasNode, GATEWAY_NODE, removalConfirmation } from '../canvas-screen';
import { Given, Then, When } from '../fixtures';

/** The definition the shared composition stands, named once so every step means one card. */
const BOUND_MODEL = 'fast';

function virtualModelCard(page: Page): Locator {
  return page.locator('.react-flow__node-virtual-model').first();
}

function bindingCable(page: Page): Locator {
  return page.locator('.react-flow__edge:not([data-id^="wire:"])').first();
}

/**
 * The stretch of canvas no card stands on, which is what a press behind the composition lands on.
 *
 * @summary The pane fills the stage, so a press at its own centre would land on whichever card the
 * arrangement seats there. The top-left corner is the one spot the tidy arrangement leaves clear at
 * every composition this suite stands.
 */
async function pressTheBareCanvas(page: Page): Promise<void> {
  await page.locator('.react-flow__pane').click({ button: 'right', position: { x: 24, y: 24 } });
}

function canvasMenu(page: Page): Locator {
  return page.getByRole('menu');
}

function canvasAct(page: Page, label: string): Locator {
  return page.getByRole('menuitem', { exact: true, name: label });
}

async function raisedOnTheModelCard(page: Page): Promise<void> {
  await virtualModelCard(page).click({ button: 'right' });
  await expect(canvasMenu(page)).toBeVisible();
}

Given('a canvas menu raised on the virtual model card', async ({ page }) => {
  await raisedOnTheModelCard(page);
});

When('the person right-clicks the canvas behind the cards', async ({ page }) => {
  await pressTheBareCanvas(page);
});

When('the person right-clicks the virtual model card', async ({ page }) => {
  await virtualModelCard(page).click({ button: 'right' });
});

When('the person right-clicks the gateway card', async ({ page }) => {
  await canvasNode(page, GATEWAY_NODE).click({ button: 'right' });
});

When('the person right-clicks the binding cable', async ({ page }) => {
  await bindingCable(page).click({ button: 'right' });
});

When('the person takes {string} off the canvas menu', async ({ page }, label: string) => {
  await canvasAct(page, label).click();
});

When('the person dismisses the canvas menu', async ({ page }) => {
  await page.keyboard.press('Escape');
  await expect(canvasMenu(page)).toBeHidden();
});

Then(
  'the canvas menu offers {string} and {string}',
  async ({ page }, first: string, second: string) => {
    await expect(canvasMenu(page)).toBeVisible();
    await expect(canvasAct(page, first)).toBeVisible();
    await expect(canvasAct(page, second)).toBeVisible();
  },
);

Then('the canvas menu carries {string}', async ({ page }, label: string) => {
  await expect(canvasMenu(page)).toBeVisible();
  await expect(canvasAct(page, label)).toBeVisible();
});

Then('the removal question stands over the canvas', async ({ page }) => {
  await expect(removalConfirmation(page, BOUND_MODEL)).toBeVisible();
});

Then('the virtual model still stands on the canvas', async ({ page }) => {
  await expect(virtualModelCard(page)).toBeVisible();
});
