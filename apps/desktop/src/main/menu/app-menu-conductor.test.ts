import type { IpcEventPayload, Settings } from '@recompose/contracts';

import { defaultSettings } from '@recompose/contracts';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { AppMenuConduct } from './app-menu-conductor';
import type { AppMenuItem } from './app-menu-template';

import { loadSettingsFile } from '../storage/settings-store';
import { conductAppMenu } from './app-menu-conductor';

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

type Conducted = {
  menu: AppMenuConduct;
  settingsFile: string;
  pushed: Settings[];
  commanded: IpcEventPayload<'canvas:command'>[];
  usageCommanded: IpcEventPayload<'usage:command'>[];
  asked: ('settings' | 'new-gateway')[];
};

async function freshSettingsFile(): Promise<string> {
  return join(await mkdtemp(join(tmpdir(), 'recompose-app-menu-')), 'settings.json');
}

function conductOver(settingsFile: string): Conducted {
  const pushed: Settings[] = [];
  const commanded: IpcEventPayload<'canvas:command'>[] = [];
  const usageCommanded: IpcEventPayload<'usage:command'>[] = [];
  const asked: ('settings' | 'new-gateway')[] = [];

  const menu = conductAppMenu({
    onOpenSettings: () => {
      asked.push('settings');
    },
    onNewGateway: () => {
      asked.push('new-gateway');
    },
    onCanvasCommand: (command) => {
      commanded.push(command);
    },
    onUsageCommand: (command) => {
      usageCommanded.push(command);
    },
    settingsFile: () => settingsFile,
    onCorrupt: () => undefined,
    pushSettings: (settings) => {
      pushed.push(settings);
    },
  });

  return { menu, settingsFile, pushed, commanded, usageCommanded, asked };
}

function installedMenu(): AppMenuItem[] {
  const painted = desktop.installed.at(-1);

  if (painted === undefined) {
    throw new Error('the app menu was never installed');
  }

  return painted;
}

function findItem(items: AppMenuItem[], label: string): AppMenuItem | undefined {
  for (const item of items) {
    if (item.label === label) {
      return item;
    }

    const nested = item.submenu === undefined ? undefined : findItem(item.submenu, label);

    if (nested !== undefined) {
      return nested;
    }
  }

  return undefined;
}

function itemNamed(label: string): AppMenuItem {
  const found = findItem(installedMenu(), label);

  if (found === undefined) {
    throw new Error(`the installed menu holds no item named "${label}"`);
  }

  return found;
}

function press(label: string): void {
  itemNamed(label).click?.();
}

beforeEach(() => {
  desktop.installed = [];
});

afterEach(() => {
  vi.restoreAllMocks();
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

describe('reflecting a stored settings document', () => {
  test('a document that hides the checklist takes the tick off the menu and reaches every window', async () => {
    const conducted = conductOver(await freshSettingsFile());
    const hidden: Settings = { ...defaultSettings(), showOnboardingChecklist: false };

    conducted.menu.reflectSettings(hidden);

    expect(itemNamed('Show Onboarding Checklist').checked).toBe(false);
    expect(conducted.pushed).toEqual([hidden]);
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

  test('leaving the gateway takes the Gateway menu away again', async () => {
    const conducted = conductOver(await freshSettingsFile());

    conducted.menu.standOnUrl(GATEWAY_DETAIL);
    conducted.menu.standOnUrl(CANVAS);

    expect(findItem(installedMenu(), 'Gateway')).toBeUndefined();
  });

  test('a second move onto the same kind of surface leaves the menu standing', async () => {
    const conducted = conductOver(await freshSettingsFile());

    conducted.menu.standOnUrl(GATEWAY_DETAIL);

    const painted = desktop.installed.length;

    conducted.menu.standOnUrl('app://renderer/index.html#/gateways/work');

    expect(desktop.installed).toHaveLength(painted);
  });
});

describe('toggling the onboarding checklist from the menu', () => {
  test('the choice takes the tick off the menu, lands on disk, and reaches every window', async () => {
    const conducted = conductOver(await freshSettingsFile());

    conducted.menu.repaint();
    press('Show Onboarding Checklist');

    await vi.waitFor(() => {
      expect(conducted.pushed).toHaveLength(1);
    });

    expect(itemNamed('Show Onboarding Checklist').checked).toBe(false);
    expect(conducted.pushed[0]?.showOnboardingChecklist).toBe(false);
    expect(
      (await loadSettingsFile(conducted.settingsFile, () => undefined)).showOnboardingChecklist,
    ).toBe(false);
  });

  test('a choice the disk refuses is written down and the menu stands as it was', async () => {
    const reported: unknown[][] = [];

    vi.spyOn(console, 'error').mockImplementation((...report: unknown[]) => {
      reported.push(report);
    });

    const occupied = join(await mkdtemp(join(tmpdir(), 'recompose-app-menu-')), 'occupied');

    await writeFile(occupied, 'not a folder', 'utf8');

    const conducted = conductOver(join(occupied, 'settings.json'));

    conducted.menu.repaint();
    press('Show Onboarding Checklist');

    await vi.waitFor(() => {
      expect(reported).toHaveLength(1);
    });

    expect(reported[0]?.[0]).toBe(
      'recompose could not store the checklist choice, so the menu stands.',
    );
    expect(itemNamed('Show Onboarding Checklist').checked).toBe(true);
    expect(conducted.pushed).toEqual([]);
  });
});
