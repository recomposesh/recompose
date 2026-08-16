import type { Locator, Page } from '@playwright/test';

import { expect } from '@playwright/test';

import { Then, When } from '../fixtures';
import { gatewayAddress, openGateway } from '../gateway-screen';
import { clipboardHolds, theClipboardStandsEmpty } from '../held-clipboard';
import { focusedGateway } from '../scenario-memory';

/** What the toolbar offers for opening the guide, which is the control this feature acts through. */
const CONNECT_A_CLIENT = 'Connect a client';

/** The definition the seeded composition holds, whose id every block a client copies has to name. */
const COMPOSED_MODEL = 'fast';

/** The first client the guide opens on, so a scenario that names no client still reads one. */
const FIRST_CLIENT = 'Claude Code';

function guide(page: Page): Locator {
  return page.getByRole('dialog', { name: new RegExp(`^Connect a client to `, 'u') });
}

async function theGuideStands(page: Page): Promise<void> {
  await openGateway(page, focusedGateway(page));
  await page.getByRole('button', { name: CONNECT_A_CLIENT, exact: true }).click();
  await expect(guide(page)).toBeVisible();
}

/** The block a client's first step offers, found by the copy control that names it. */
function blockFor(page: Page, step: string): Locator {
  return page.getByRole('button', { name: `Copy the block for ${step}` });
}

When('the person opens the connect guide', async ({ page }) => {
  await theGuideStands(page);
});

When('the person opens the connect guide and picks {string}', async ({ page }, client: string) => {
  await theGuideStands(page);
  await page.getByRole('button', { name: new RegExp(`^${client} `, 'u') }).click();
  await expect(page.getByRole('heading', { name: client })).toBeVisible();
});

When('the person copies the Claude Code setup block', async ({ page, electronApp }) => {
  await theClipboardStandsEmpty(electronApp);
  await theGuideStands(page);
  await blockFor(page, 'Point it at the gateway').click();
});

Then('the guide stands for that gateway', async ({ page }) => {
  const name = focusedGateway(page);

  await expect(page.getByRole('dialog', { name: `Connect a client to ${name}` })).toBeVisible();
  await expect(page.getByRole('heading', { name: FIRST_CLIENT })).toBeVisible();
});

Then('the Claude Code block names the gateway address and the model id', async ({ page }) => {
  const address = await gatewayAddress(page, focusedGateway(page));

  await expect(guide(page)).toContainText(`export ANTHROPIC_BASE_URL="${address}"`);
  await expect(guide(page)).toContainText(`export ANTHROPIC_MODEL="${COMPOSED_MODEL}"`);
});

Then('the address offered ends in the version segment', async ({ page }) => {
  const address = await gatewayAddress(page, focusedGateway(page));

  await expect(guide(page).getByText(`${address}/v1`, { exact: true })).toBeVisible();
});

Then('the clipboard holds every line of that block', async ({ page, electronApp }) => {
  const address = await gatewayAddress(page, focusedGateway(page));

  await expect
    .poll(async () => clipboardHolds(electronApp))
    .toContain(`export ANTHROPIC_BASE_URL="${address}"`);

  const copied = await clipboardHolds(electronApp);

  expect(copied).toContain(`export ANTHROPIC_MODEL="${COMPOSED_MODEL}"`);
});
