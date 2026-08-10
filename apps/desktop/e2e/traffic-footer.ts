import type { Locator, Page } from '@playwright/test';

/** The strip under the canvas, which belongs to the canvas column rather than to the window. */
export function trafficFooter(page: Page): Locator {
  return page.locator('[data-canvas-column] > footer');
}

/**
 * Everything the strip prints where a person can read it, run together as one line.
 *
 * @operation The reading comes off what the strip renders rather than off what it holds, because a
 * cell the container query has taken away is a cell nobody can read, and the description standing
 * beside the client-app count is written for a screen reader alone. Both drop out of this reading
 * exactly as they drop out of a person's.
 */
export async function footerReading(page: Page): Promise<string> {
  return (await trafficFooter(page).innerText()).replaceAll(/\s+/gu, ' ').trim();
}

/** The one control on the strip, which is the disclosure that stands the logs drawer up. */
export function logsControl(page: Page): Locator {
  return trafficFooter(page).getByRole('button', { exact: true, name: 'Logs' });
}
