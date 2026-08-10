import { expect } from '@playwright/test';

import { chooseMenuItem, menuItemChecked } from '../app-menu';
import { Given, Then, When } from '../fixtures';
import {
  clipboardHolds,
  textStandsSelected,
  theClipboardStandsEmpty,
  theSelectionIsCopied,
  keyboardReaches,
} from '../held-clipboard';
import {
  closeLogsControl,
  drawerSharesTheColumn,
  logsHeading,
  theLogsDrawerOpens,
} from '../logs-drawer';
import { SERVING_GATEWAY } from '../served-gateway';
import { footerReading, logsControl, trafficFooter } from '../traffic-footer';

/** The Gateway menu item that stands the drawer up, named the way the menu names it. */
const SHOW_LOGS = 'Show Logs';

Given('the drawer stands open through the menu', async ({ electronApp, page }) => {
  await chooseMenuItem(electronApp, SHOW_LOGS);
  await expect(logsHeading(page, SERVING_GATEWAY)).toBeVisible();
});

Given('a footer reading live traffic', async ({ electronApp, page }) => {
  await expect(trafficFooter(page)).toBeVisible();
  await expect.poll(async () => footerReading(page)).toContain('req/min');
  await theClipboardStandsEmpty(electronApp);
});

When("the person presses the Logs control at the footer's end", async ({ page }) => {
  await theLogsDrawerOpens(page, SERVING_GATEWAY);
});

When('the person takes the close control', async ({ page }) => {
  await closeLogsControl(page).click();
});

When('the person opens the drawer using only the keyboard', async ({ page }) => {
  await keyboardReaches(page, logsControl(page));
  await page.keyboard.press('Enter');
});

When('the person picks {string} from the Gateway menu', async ({ electronApp }, item: string) => {
  expect(item).toBe(SHOW_LOGS);
  await chooseMenuItem(electronApp, item);
});

When('the person picks {string} again', async ({ electronApp }, item: string) => {
  expect(item).toBe(SHOW_LOGS);
  await chooseMenuItem(electronApp, item);
});

When('the person selects the footer text and copies it', async ({ electronApp, page }) => {
  await textStandsSelected(trafficFooter(page));
  await theSelectionIsCopied(electronApp);
});

Then('the logs drawer opens under the stage', async ({ page }) => {
  await expect(logsHeading(page, SERVING_GATEWAY)).toBeVisible();
  await expect.poll(async () => drawerSharesTheColumn(page)).toBe(true);
});

Then('the logs drawer stands open', async ({ page }) => {
  await expect(logsHeading(page, SERVING_GATEWAY)).toBeVisible();
});

Then('the logs drawer opens', async ({ page }) => {
  await expect(logsHeading(page, SERVING_GATEWAY)).toBeVisible();
});

Then('the menu item reads checked', async ({ electronApp }) => {
  await expect.poll(async () => menuItemChecked(electronApp, SHOW_LOGS)).toBe(true);
});

Then('the clipboard holds the reading', async ({ electronApp, page }) => {
  const reading = await footerReading(page);
  const copied = (await clipboardHolds(electronApp)).replaceAll(/\s+/gu, ' ').trim();

  expect(copied).not.toBe('');

  for (const cell of ['req/min', 'client apps']) {
    expect(copied).toContain(cell);
    expect(reading).toContain(cell);
  }
});
