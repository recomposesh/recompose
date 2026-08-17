import type { ElectronApplication } from '@playwright/test';

function platformHoldsLoginItem(): boolean {
  return process.platform === 'darwin' || process.platform === 'win32';
}

export async function readLoginItem(app: ElectronApplication): Promise<boolean | null> {
  if (!platformHoldsLoginItem()) {
    return null;
  }

  return app.evaluate(
    ({ app: runningApp }) =>
      runningApp.getLoginItemSettings({ path: process.execPath, args: [] }).openAtLogin,
  );
}

export async function restoreLoginItem(
  app: ElectronApplication,
  openAtLogin: boolean | null,
): Promise<void> {
  if (openAtLogin === null) {
    return;
  }

  await app.evaluate(({ app: runningApp }, enabled) => {
    const target = { path: process.execPath, args: [] };

    if (runningApp.getLoginItemSettings(target).openAtLogin === enabled) {
      return;
    }

    runningApp.setLoginItemSettings({ ...target, openAtLogin: enabled });
  }, openAtLogin);
}
