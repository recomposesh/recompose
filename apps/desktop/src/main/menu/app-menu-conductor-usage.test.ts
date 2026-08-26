import type { IpcEventPayload } from '@recompose/contracts';

import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { AppMenuConduct } from './app-menu-conductor';
import type { AppMenuItem } from './app-menu-template';

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
const USAGE = 'app://renderer/index.html#/usage?range=24h';

type Conducted = {
  menu: AppMenuConduct;
  usageCommanded: IpcEventPayload<'usage:command'>[];
};

async function conducted(): Promise<Conducted> {
  const usageCommanded: IpcEventPayload<'usage:command'>[] = [];
  const settingsFile = join(
    await mkdtemp(join(tmpdir(), 'recompose-usage-menu-')),
    'settings.json',
  );

  const menu = conductAppMenu({
    onOpenSettings: () => undefined,
    onNewGateway: () => undefined,
    onOpenGateways: () => undefined,
    onOpenProviders: () => undefined,
    onOpenUsage: () => undefined,
    onCanvasCommand: () => undefined,
    onUsageCommand: (command) => {
      usageCommanded.push(command);
    },
    onViewCommand: () => undefined,
    onOpenSetup: () => undefined,
    onStartGateway: () => undefined,
    onStopGateway: () => undefined,
    onRestartGateway: () => undefined,
    onOpenHelpSite: () => undefined,
    onOpenConfigFolder: () => undefined,
    onReportIssue: () => undefined,
    onCheckForUpdates: () => undefined,
    development: true,
    settingsFile: () => settingsFile,
    onCorrupt: () => undefined,
    pushSettings: () => undefined,
  });

  return { menu, usageCommanded };
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

function press(label: string): void {
  findItem(installedMenu(), label)?.click?.();
}

beforeEach(() => {
  desktop.installed = [];
});

describe('following the usage surface', () => {
  test('standing on usage brings the Usage menu, and leaving takes it away', async () => {
    const stood = await conducted();

    stood.menu.standOnUrl(USAGE);

    expect(installedMenu().find((menu) => menu.label === 'Usage')).toBeDefined();

    stood.menu.standOnUrl(CANVAS);

    expect(installedMenu().find((menu) => menu.label === 'Usage')).toBeUndefined();
  });

  test('a Usage menu command reaches the page', async () => {
    const stood = await conducted();

    stood.menu.standOnUrl(USAGE);
    press('Refresh Usage');
    press('Last 7 Days');

    expect(stood.usageCommanded).toEqual(['refresh', 'range-7d']);
  });

  test('the data table tick follows what the renderer reports, in both directions', async () => {
    const stood = await conducted();

    stood.menu.standOnUrl(USAGE);
    stood.menu.reflectUsageTable(true);

    expect(findItem(installedMenu(), 'Show Data Table')?.checked).toBe(true);

    stood.menu.reflectUsageTable(false);

    expect(findItem(installedMenu(), 'Show Data Table')?.checked).toBe(false);
  });
});
