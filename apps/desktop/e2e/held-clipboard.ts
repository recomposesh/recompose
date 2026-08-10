import type { ElectronApplication, Locator, Page } from '@playwright/test';

/** The chord a person copies with, which the platform rather than the app decides. */
export const COPY_CHORD = process.platform === 'darwin' ? 'Meta+c' : 'Control+c';

/** How many presses a keyboard walk may spend before a control is called out of its reach. */
const WALK_LIMIT = 80;

/** What the machine's clipboard holds, read where a clipboard actually lives. */
export async function clipboardHolds(app: ElectronApplication): Promise<string> {
  return app.evaluate(({ clipboard }) => clipboard.readText());
}

/** Empties the clipboard, so what a scenario reads back is what its own copy put there. */
export async function theClipboardStandsEmpty(app: ElectronApplication): Promise<void> {
  await app.evaluate(({ clipboard }) => {
    clipboard.writeText('');
  });
}

/** Takes a run of text into the selection, the way a person sweeps a pointer across it. */
export async function textStandsSelected(reading: Locator): Promise<void> {
  await reading.evaluate((held) => {
    const across = document.createRange();

    across.selectNodeContents(held);

    const selection = window.getSelection();

    selection?.removeAllRanges();
    selection?.addRange(across);
  });
}

/**
 * Copies whatever stands selected, through the app's own copy rather than a chord.
 *
 * @operation A chord aimed at a page reaches the page, while copying a plain selection is the
 * window's own act, hanging off the Edit menu on every platform. The scenario therefore asks the
 * window for exactly the act that menu item runs.
 */
export async function theSelectionIsCopied(app: ElectronApplication): Promise<void> {
  await app.evaluate(({ BrowserWindow }) => {
    const [window] = BrowserWindow.getAllWindows();

    if (window === undefined) {
      throw new Error('no window stands, so nothing holds a selection to copy');
    }

    window.webContents.copy();
  });
}

/**
 * Walks the keyboard onto one control and stops there.
 *
 * @summary The walk is real presses rather than focus placed from script, because a scenario about
 * the keyboard alone proves nothing if the automation reaches past the keyboard to arrive.
 */
export async function keyboardReaches(page: Page, control: Locator): Promise<void> {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });

  for (let presses = 0; presses < WALK_LIMIT; presses += 1) {
    const arrived = await control.evaluate((held) => held === document.activeElement);

    if (arrived) {
      return;
    }

    await page.keyboard.press('Tab');
  }

  throw new Error('no keyboard walk reached the control this scenario presses');
}
