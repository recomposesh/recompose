import { expect, test, vi } from 'vitest';

/**
 * A store with nothing remembered, which is what every reading here starts from.
 *
 * @summary The module itself rather than the barrel, because re-evaluating the barrel drags the
 * whole shared library through the loader on every reading and times the file out under load.
 */
async function aFreshSheet() {
  vi.resetModules();

  return import('./connect-sheet-visibility');
}

test('the sheet stands away with the app, because a person asks for it after wiring a gateway', async () => {
  const sheet = await aFreshSheet();

  expect(sheet.connectSheetOpen()).toBe(false);
});

test('the toolbar control brings the sheet out', async () => {
  const sheet = await aFreshSheet();

  sheet.openConnectSheet();

  expect(sheet.connectSheetOpen()).toBe(true);
});

test('asking twice leaves the sheet out once, so nothing repaints over a change that never happened', async () => {
  const sheet = await aFreshSheet();
  let repaints = 0;
  const stop = sheet.subscribeToConnectSheetVisibility(() => {
    repaints += 1;
  });

  sheet.openConnectSheet();
  sheet.openConnectSheet();
  stop();

  expect(repaints).toBe(1);
  expect(sheet.connectSheetOpen()).toBe(true);
});

test('putting the sheet away leaves the canvas as it was', async () => {
  const sheet = await aFreshSheet();

  sheet.openConnectSheet();
  sheet.closeConnectSheet();

  expect(sheet.connectSheetOpen()).toBe(false);
});

test('a reader that stopped watching hears nothing more', async () => {
  const sheet = await aFreshSheet();
  let repaints = 0;
  const stop = sheet.subscribeToConnectSheetVisibility(() => {
    repaints += 1;
  });

  stop();
  sheet.openConnectSheet();

  expect(repaints).toBe(0);
});

test('shutting a sheet that already stands away changes nothing', async () => {
  const sheet = await aFreshSheet();
  let repaints = 0;
  const stop = sheet.subscribeToConnectSheetVisibility(() => {
    repaints += 1;
  });

  sheet.closeConnectSheet();
  stop();

  expect(repaints).toBe(0);
});
