import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { AppMenuItem } from './app-menu-template';

import { conductOver, freshSettingsFile, menuProbe } from './app-menu-conductor.testkit';

const desktop = vi.hoisted((): { installed: AppMenuItem[][] } => ({ installed: [] }));

vi.mock('electron', () => ({
  Menu: {
    buildFromTemplate: (template: AppMenuItem[]): AppMenuItem[] => template,
    setApplicationMenu: (menu: AppMenuItem[]): void => {
      desktop.installed.push(menu);
    },
  },
}));

const CANVAS = 'app://renderer/index.html#/';
const GATEWAY_DETAIL = 'app://renderer/index.html#/gateways/personal';

const { findItem, installedMenu, itemNamed, press } = menuProbe(desktop);

beforeEach(() => {
  desktop.installed = [];
});

describe('the menu the app paints at boot', () => {
  test('the checklist stands ticked and no Gateway menu is offered yet', async () => {
    const conducted = conductOver(await freshSettingsFile());

    conducted.menu.repaint();

    expect(itemNamed('Show Onboarding Checklist').checked).toBe(true);
    expect(findItem(installedMenu(), 'Gateway')).toBeUndefined();
  });

  test('each item reaches the seam it names', async () => {
    const conducted = conductOver(await freshSettingsFile());

    conducted.menu.repaint();
    press('Settings…');
    press('New Gateway…');

    expect(conducted.asked).toEqual(['settings', 'new-gateway']);
  });
});

describe('reflecting what the updater owns', () => {
  test('a menu painted before the updater speaks offers no check', async () => {
    const conducted = conductOver(await freshSettingsFile());

    conducted.menu.repaint();

    expect(findItem(installedMenu(), 'Check for Updates…')).toBeUndefined();
  });

  test('an install that updates itself gains the item, and loses it while a check runs', async () => {
    const conducted = conductOver(await freshSettingsFile());

    conducted.menu.reflectUpdateCheck('idle');

    expect(itemNamed('Check for Updates…').enabled).toBe(true);

    conducted.menu.reflectUpdateCheck('asking');

    expect(itemNamed('Check for Updates…').enabled).toBe(false);
  });

  test('the same standing twice repaints nothing, because nothing the menu reads moved', async () => {
    const conducted = conductOver(await freshSettingsFile());

    conducted.menu.reflectUpdateCheck('idle');
    conducted.menu.reflectUpdateCheck('idle');

    expect(desktop.installed).toHaveLength(1);
  });
});

describe('following the surface a window stands on', () => {
  test('standing on a gateway brings the Gateway menu', async () => {
    const conducted = conductOver(await freshSettingsFile());

    conducted.menu.standOnUrl(GATEWAY_DETAIL);

    expect(findItem(installedMenu(), 'Gateway')).toBeDefined();
  });

  test('a Gateway menu command reaches the canvas', async () => {
    const conducted = conductOver(await freshSettingsFile());

    conducted.menu.standOnUrl(GATEWAY_DETAIL);
    press('Zoom to Fit');

    expect(conducted.commanded).toEqual(['zoom-to-fit']);
  });

  test('leaving the gateway takes the Gateway menu away again', async () => {
    const conducted = conductOver(await freshSettingsFile());

    conducted.menu.standOnUrl(GATEWAY_DETAIL);
    conducted.menu.standOnUrl(CANVAS);

    expect(findItem(installedMenu(), 'Gateway')).toBeUndefined();
  });

  test('a second report of the same address repaints nothing', async () => {
    const conducted = conductOver(await freshSettingsFile());

    conducted.menu.standOnUrl(GATEWAY_DETAIL);

    const painted = desktop.installed.length;

    conducted.menu.standOnUrl(GATEWAY_DETAIL);

    expect(desktop.installed).toHaveLength(painted);
  });
});

describe('the logs drawer tick behind the Gateway menu', () => {
  test('arriving at a gateway offers the logs drawer unchecked, because no drawer stands open yet', async () => {
    const conducted = conductOver(await freshSettingsFile());

    conducted.menu.standOnUrl(GATEWAY_DETAIL);

    expect(itemNamed('Show Logs').checked).toBe(false);
  });

  test('the tick follows the drawer the renderer reports, in both directions', async () => {
    const conducted = conductOver(await freshSettingsFile());

    conducted.menu.standOnUrl(GATEWAY_DETAIL);
    conducted.menu.reflectLogsDrawer(true);

    expect(itemNamed('Show Logs').checked).toBe(true);

    conducted.menu.reflectLogsDrawer(false);

    expect(itemNamed('Show Logs').checked).toBe(false);
  });

  test('a drawer that opened before the surface arrived still reads ticked on arrival', async () => {
    const conducted = conductOver(await freshSettingsFile());

    conducted.menu.reflectLogsDrawer(true);
    conducted.menu.standOnUrl(GATEWAY_DETAIL);

    expect(itemNamed('Show Logs').checked).toBe(true);
  });
});
