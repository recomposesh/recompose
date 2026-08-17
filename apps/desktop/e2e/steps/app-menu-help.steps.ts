import type { ElectronApplication, Page } from '@playwright/test';

import { expect } from '@playwright/test';
import { revealLabelFor } from '@recompose/contracts';

import { fileBrowserFor } from '../../src/main/system/file-browser';
import { chooseMenuItemAt, menuItemEnabled } from '../app-menu';
import { Then, When } from '../fixtures';

async function watchExternalOpens(app: ElectronApplication): Promise<void> {
  await app.evaluate(({ shell }) => {
    shell.openExternal = async (address: string) => {
      process.env['RECOMPOSE_E2E_OPENED_EXTERNALLY'] = address;

      return Promise.resolve();
    };
  });
}

async function openedExternally(app: ElectronApplication): Promise<string> {
  return app.evaluate(() => process.env['RECOMPOSE_E2E_OPENED_EXTERNALLY'] ?? '');
}

async function watchHelpFolderOpens(app: ElectronApplication): Promise<void> {
  await app.evaluate(({ shell }) => {
    shell.openPath = async (folder: string) => {
      process.env['RECOMPOSE_E2E_OPENED_FOLDER'] = folder;

      return Promise.resolve('');
    };
  });
}

async function settingsRevealWording(page: Page): Promise<string> {
  await page.getByRole('link', { name: 'Settings' }).click();

  const wording = await page.getByRole('group', { name: 'Data' }).getByRole('button').textContent();

  if (wording === null || wording === '') {
    throw new Error('the settings screen prints no reveal action to compare against');
  }

  return wording;
}

When('the person picks Recompose Help from the Help menu', async ({ electronApp }) => {
  await watchExternalOpens(electronApp);
  await chooseMenuItemAt(electronApp, ['Help', 'Recompose Help']);
});

When('the person picks the issue report from the Help menu', async ({ electronApp }) => {
  await watchExternalOpens(electronApp);
  await chooseMenuItemAt(electronApp, ['Help', 'Report an Issue…']);
});

When('the person picks the config folder item from the Help menu', async ({ electronApp }) => {
  await watchHelpFolderOpens(electronApp);
  await chooseMenuItemAt(electronApp, ['Help', revealLabelFor(fileBrowserFor(process.platform))]);
});

Then('the browser opens the recompose site', async ({ electronApp }) => {
  await expect.poll(async () => openedExternally(electronApp)).toBe('https://recompose.sh');
});

Then("the browser opens the repository's new-issue page", async ({ electronApp }) => {
  await expect
    .poll(async () => openedExternally(electronApp))
    .toBe('https://github.com/recomposesh/recompose/issues/new');
});

Then(
  "the Help menu's config folder item reads the same words as the settings screen's reveal action",
  async ({ electronApp, page }) => {
    const wording = await settingsRevealWording(page);

    await expect.poll(async () => menuItemEnabled(electronApp, ['Help', wording])).toBe(true);
  },
);
