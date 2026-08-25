import type { Locator, Page } from '@playwright/test';

import { expect } from '@playwright/test';

/** The surface setup holds the window with, whichever step it stands on. */
export function setupSurface(page: Page): Locator {
  return page.getByRole('dialog', {
    name: /^(Welcome to recompose|Which harnesses|Where should)/u,
  });
}

/** Waits until setup holds the window, so a step never reads a surface still arriving. */
export async function setupStanding(page: Page): Promise<void> {
  await expect(setupSurface(page)).toBeVisible();
}

/** Leaves setup the way the welcome step offers, which is the same standing as dismissing it. */
export async function leftToExplore(page: Page): Promise<void> {
  await page.getByRole('button', { name: "I'll explore on my own" }).click();
  await expect(setupSurface(page)).toHaveCount(0);
}

/** Walks setup from the welcome step to the harness question. */
export async function walkedToHarnesses(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Set up my gateway' }).click();
  await expect(page.getByRole('dialog', { name: 'Which harnesses do you use?' })).toBeVisible();
}
