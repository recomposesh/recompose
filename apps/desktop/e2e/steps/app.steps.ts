import type { ElectronApplication, Page } from '@playwright/test';

import { _electron as electron, expect } from '@playwright/test';
import { join } from 'node:path';
import { createBdd } from 'playwright-bdd';

import { Given, inheritedEnv, test, Then, When } from '../fixtures';
import { openProviderScreen } from '../provider-screen';

const { After } = createBdd(test);

const appRoot = join(__dirname, '../..');

/** The process each page belonged to before the theme changed, so a scenario can prove nothing restarted. */
export const processIdsBeforeThemeSwitch = new WeakMap<Page, number>();

export type RestartedApp = {
  app: ElectronApplication;
  page: Page;
  visibleBeforeContentReady: boolean;
};

const restartedApps = new WeakMap<Page, RestartedApp>();

export function processIdOf(app: ElectronApplication): number {
  const { pid } = app.process();

  if (pid === undefined) {
    throw new Error('the running app reported no process id');
  }

  return pid;
}

export async function windowVisibility(app: ElectronApplication): Promise<boolean> {
  return app.evaluate(
    ({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.isVisible() ?? false,
  );
}

/** The app a scenario restarted, which is a second process reading the first one's folder. */
export function restartedAppFor(page: Page): RestartedApp {
  const restarted = restartedApps.get(page);

  if (restarted === undefined) {
    throw new Error('the app was never restarted in this scenario');
  }

  return restarted;
}

/**
 * A second application over the first one's folder, closed again if it never finishes coming up.
 *
 * @summary Only the returned application reaches the `After` hook that closes it, so an app that
 * fails while its window is opening would be one nothing holds and nothing ends. It outlives the
 * whole run, holding the worker's user data folder, and the next run reads a folder a live process
 * still owns. A failing close is reported rather than thrown, because the launch failure under it
 * is the one worth reading.
 *
 * The restart shows its window whatever the shell asked of the run. `RECOMPOSE_WINDOW_STAYS_BACK`
 * stops `show()` outright rather than ordering the window behind others, and the whole point of a
 * restart scenario is that the window appears, painted in the stored theme. The fixture decides
 * that marker per launch for the same reason, so a shell that exports it globally reaches every
 * launch through `inheritedEnv` and would leave this one invisible forever.
 */
async function launchFrom(userDataDir: string): Promise<RestartedApp> {
  const app = await electron.launch({
    args: [appRoot],
    colorScheme: null,
    env: {
      ...inheritedEnv(),
      NODE_ENV: 'production',
      ELECTRON_RENDERER_URL: '',
      RECOMPOSE_USER_DATA_DIR: userDataDir,
      RECOMPOSE_WINDOW_STAYS_BACK: '',
    },
  });

  try {
    const page = await app.firstWindow();
    const visibleBeforeContentReady = await windowVisibility(app);

    await page.waitForLoadState('domcontentloaded');

    return { app, page, visibleBeforeContentReady };
  } catch (comingUp) {
    await app.close().catch((closing: unknown) => {
      process.stderr.write(
        `the restarted app failed to close after failing to open: ${String(closing)}\n`,
      );
    });

    throw comingUp;
  }
}

When('the maintainer switches the theme to dark', async ({ electronApp, page }) => {
  processIdsBeforeThemeSwitch.set(page, processIdOf(electronApp));

  await page.getByRole('radio', { name: 'Dark' }).click();
});

Given('the app is on the gateways screen', async ({ page }) => {
  await expect(page.getByRole('group', { name: 'Local gateways' })).toBeVisible();
});

Given('the app is on the API keys screen', async ({ page }) => {
  await openProviderScreen(page, 'API keys');
});

Given('the app is on the subscriptions screen', async ({ page }) => {
  await openProviderScreen(page, 'Subscriptions');
});

Given('the app is on the Aggregators screen', async ({ page }) => {
  await openProviderScreen(page, 'Aggregators');
});

Given('the app is on the Local runtimes screen', async ({ page }) => {
  await openProviderScreen(page, 'Local runtimes');
});

Given('the app is on the settings screen', async ({ page }) => {
  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
});

Then('the app offers {string}', async ({ page }, label: string) => {
  await expect(page.getByRole('button', { name: label })).toBeVisible();
});

When('the app restarts', async ({ electronApp, page }) => {
  const userDataDir = await electronApp.evaluate(({ app }) => app.getPath('userData'));

  restartedApps.set(page, await launchFrom(userDataDir));
});

After(async ({ page }) => {
  await restartedApps.get(page)?.app.close();
});
