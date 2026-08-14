import type { Locator, Page } from '@playwright/test';

import { expect } from '@playwright/test';

/**
 * How many presses a walk may spend before the keyboard is called unable to reach a control.
 *
 * @summary The bound is sized for the whole window rather than for one popup, because a control
 * inside the inspector sits behind every card and cable the canvas stands, and a walk that gives
 * up at the pane's edge would call a reachable control unreachable.
 */
const TAB_LIMIT = 120;

/**
 * Walks the keyboard onto one control and presses it, the way a person without a pointer would.
 *
 * @summary The walk is real presses from wherever the scenario left the focus, because a step that
 * places focus from script proves nothing about the keyboard: it would pass just as happily on a
 * control the tab order never visits. Reaching nothing throws by name rather than timing out, so a
 * control that fell out of the tab order reads as the defect it is.
 */
export async function pickWithTheKeyboard(
  page: Page,
  option: Locator,
  named: string,
): Promise<void> {
  await expect(option).toBeVisible();

  for (let presses = 0; presses < TAB_LIMIT; presses += 1) {
    if (await option.evaluate((held) => held === document.activeElement)) {
      await page.keyboard.press('Enter');

      return;
    }

    await page.keyboard.press('Tab');
  }

  throw new Error(`no keyboard walk reached ${named}`);
}
