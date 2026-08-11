import type { Locator, Page } from '@playwright/test';

import { expect } from '@playwright/test';

import { gatewayRow } from './gateway-screen';

/** What the inspector heads a draft with, which is the subject a person completes there. */
const DRAFT_SUBJECT = 'Virtual model';

function asideHeaded(page: Page, heading: string): Locator {
  return page
    .locator('aside')
    .filter({ has: page.getByRole('heading', { exact: true, level: 2, name: heading }) });
}

/** The inspector for one gateway, which stands beside the stage the moment a gateway is picked. */
function gatewayDrawer(page: Page, name: string): Locator {
  return asideHeaded(page, name);
}

/** The inspector while a draft holds it, which is where a definition completes. */
export function draftInspector(page: Page): Locator {
  return asideHeaded(page, DRAFT_SUBJECT);
}

/** Picks a gateway out of the sidebar, opens its inspector, and waits for it to stand. */
export async function openGatewayDrawer(page: Page, name: string): Promise<void> {
  await gatewayRow(page, name).click();

  if (!(await gatewayDrawer(page, name).isVisible())) {
    await page.getByRole('button', { name: 'Inspector' }).click();
  }

  await expect(gatewayDrawer(page, name)).toBeVisible();
}

/** Every virtual model the drawer shows the gateway serving. */
export function servedRows(page: Page, name: string): Locator {
  return gatewayDrawer(page, name).getByRole('listitem');
}

export function servedRow(page: Page, name: string, carrying: string): Locator {
  return servedRows(page, name).filter({ hasText: carrying });
}

/**
 * The lines one row prints, in the order a person reads down them.
 *
 * @summary A row is read whole rather than matched line by line, because two lines of a stacked
 * row can carry the same words and a locator that finds both proves nothing about their order.
 */
export async function rowLines(row: Locator): Promise<string[]> {
  const printed = await row.innerText();

  return printed
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');
}

/** The field the inspector opens a draft on, which is where the name is typed. */
export function draftNameField(page: Page): Locator {
  return draftInspector(page).getByRole('textbox', { name: 'Name' });
}

/** One model the inspector offers, which reads as the id a provider serves it under. */
export function inspectorModelOption(page: Page, providerModel: string): Locator {
  return draftInspector(page).getByRole('button', { exact: true, name: providerModel });
}

/** The refusal the inspector prints, which a failed model-list look stands as. */
export function inspectorRefusal(page: Page): Locator {
  return draftInspector(page).getByRole('alert');
}

/** Picks a target in the inspector, and waits for the model field to stop waiting on one. */
export async function pickTargetInInspector(page: Page, account: string): Promise<void> {
  await draftInspector(page).getByRole('button', { name: account }).click();
  await expect(draftInspector(page).getByText('Pick a target first.')).toBeHidden();
}
