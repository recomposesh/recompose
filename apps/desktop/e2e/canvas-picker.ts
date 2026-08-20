import type { Locator, Page } from '@playwright/test';

import { expect } from '@playwright/test';

/** The stage a released cable opens on, which names the two kinds a binding may meet. */
export function bindingKindAsk(page: Page): Locator {
  return page.getByRole('dialog', { name: 'Bind this model to' });
}

/**
 * Answers the binding ask with a provider, which is the stage every account pick now opens on.
 *
 * @summary The press is scoped to the ask itself, because the canvas standing behind it holds
 * provider cards whose names read like the options.
 */
export async function pickTheProviderKind(page: Page): Promise<void> {
  await bindingKindAsk(page)
    .getByRole('button', { name: /^Provider/u })
    .click();
}

/** The stage of the picker that asks which stored account a binding lands on. */
export function accountPicker(page: Page): Locator {
  return page.getByRole('dialog', { name: 'Connected providers' });
}

/**
 * Answers the mode step a nested router opens on, which stands between the ask and the write.
 *
 * @summary A router nested from another router's port is composed rather than copied, so it says
 * how it spreads before anything stores. Failover is what a scenario about the nesting itself
 * means, because it is the one mode that owes nothing further and lands the child in one press.
 */
export async function pickTheNestedRouterMode(page: Page, mode: string): Promise<void> {
  await page
    .getByRole('dialog', { name: 'Pick the routing mode' })
    .getByRole('radio', { name: mode })
    .click();
}

/** The stage of the picker that asks which model the chosen account serves. */
export function providerModelPicker(page: Page): Locator {
  return page.getByRole('dialog', { name: /^Models .+ serves$/ });
}

async function pickAccount(page: Page, account: string): Promise<void> {
  await accountPicker(page).getByRole('button', { name: account }).click();
}

export async function pickProviderModel(page: Page, providerModel: string): Promise<void> {
  await providerModelPicker(page).getByRole('button', { name: providerModel }).click();
}

/**
 * Settles the two halves a stored target carries, from the account stage on.
 *
 * @summary A stored binding always carries a provider model, so no pick that stops after the
 * account can write one. Reach for this where a step already answered the ask that names the two
 * kinds, and for `completeThePick` where the ask is still standing.
 */
export async function pickTheStoredTarget(
  page: Page,
  account: string,
  providerModel: string,
): Promise<void> {
  await pickAccount(page, account);
  await pickProviderModel(page, providerModel);
  await expect(providerModelPicker(page)).toBeHidden();
}

/**
 * Settles a whole binding, which is what a drop on empty canvas or a plus opens.
 *
 * @summary The ask that names the two kinds comes first, because a cable may now meet a router as
 * well as a target. A drop onto a card that already stands opens the model stage alone, and such a
 * step reaches for `pickProviderModel` instead.
 */
export async function completeThePick(
  page: Page,
  account: string,
  providerModel: string,
): Promise<void> {
  await pickTheProviderKind(page);
  await pickTheStoredTarget(page, account, providerModel);
}
