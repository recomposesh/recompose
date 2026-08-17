import { defaultSettings } from '@recompose/contracts';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, test, vi } from 'vitest';

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

const DETAIL = 'app://renderer/index.html#/gateways/personal';
const CANVAS = 'app://renderer/index.html#/';
const PROVIDERS = 'app://renderer/index.html#/providers';
const USAGE_SPEND = 'app://renderer/index.html#/usage?range=this-week&metric=spend';

async function standingConduct(taken: string[] = []) {
  const settingsFile = join(await mkdtemp(join(tmpdir(), 'recompose-menu-standing-')), 's.json');

  return conductAppMenu({
    onOpenSettings: () => undefined,
    onNewGateway: () => undefined,
    onOpenGateways: () => undefined,
    onOpenProviders: () => undefined,
    onOpenUsage: () => undefined,
    onCanvasCommand: () => undefined,
    onUsageCommand: () => undefined,
    onViewCommand: () => undefined,
    onStartGateway: (slug) => {
      taken.push(`start ${slug}`);
    },
    onStopGateway: (slug) => {
      taken.push(`stop ${slug}`);
    },
    onRestartGateway: (slug) => {
      taken.push(`restart ${slug}`);
    },
    onOpenHelpSite: () => undefined,
    onOpenConfigFolder: () => undefined,
    onReportIssue: () => undefined,
    development: true,
    settingsFile: () => settingsFile,
    onCorrupt: () => undefined,
    pushSettings: () => undefined,
  });
}

function flatItems(items: AppMenuItem[]): AppMenuItem[] {
  return items.flatMap((item) => [item, ...flatItems(item.submenu ?? [])]);
}

function standing(label: string): AppMenuItem | undefined {
  return flatItems(desktop.installed.at(-1) ?? []).find((item) => item.label === label);
}

function topLevel(label: string): AppMenuItem | undefined {
  return (desktop.installed.at(-1) ?? []).find((menu) => menu.label === label);
}

function enabledOf(label: string): boolean | undefined {
  return standing(label)?.enabled;
}

function tickOf(label: string): boolean | undefined {
  return standing(label)?.checked;
}

function press(label: string): void {
  standing(label)?.click?.();
}

beforeEach(() => {
  desktop.installed = [];
});

describe('standing nowhere once the last window goes', () => {
  test('the route menus leave and the toggles disarm with cleared ticks', async () => {
    const menu = await standingConduct();

    menu.standOnUrl(DETAIL);

    expect(topLevel('Gateway')).toBeDefined();

    menu.standNowhere();

    expect(topLevel('Gateway')).toBeUndefined();
    expect(enabledOf('Show Sidebar')).toBe(false);
    expect(tickOf('Show Sidebar')).toBe(false);
  });

  test('a fresh window standing re-arms the toggles', async () => {
    const menu = await standingConduct();

    menu.standNowhere();
    menu.standOnUrl(CANVAS);

    expect(enabledOf('Show Sidebar')).toBe(true);
  });
});

describe('reflecting the surface report into the view', () => {
  test('a report carrying the standing values repaints nothing, and a changed one repaints once', async () => {
    const menu = await standingConduct();

    menu.repaint();

    const painted = desktop.installed.length;

    menu.reflectSurfaceToggles({ sidebar: true, inspector: false, modal: false });

    expect(desktop.installed.length).toBe(painted);

    menu.reflectSurfaceToggles({ sidebar: false, inspector: true, modal: false });
    menu.reflectSurfaceToggles({ sidebar: false, inspector: true, modal: false });

    expect(desktop.installed.length).toBe(painted + 1);
  });
});

describe('a move onto another gateway', () => {
  test('keeps the Gateway menu standing on the new slug', async () => {
    const menu = await standingConduct();

    menu.standOnUrl(DETAIL);
    menu.standOnUrl('app://renderer/index.html#/gateways/work');

    expect(topLevel('Gateway')).toBeDefined();
  });
});

describe('the engine states behind the lifecycle group', () => {
  test('a push standing the serving flag enables Stop, and a pick names the slug', async () => {
    const taken: string[] = [];
    const menu = await standingConduct(taken);

    menu.standOnUrl(DETAIL);

    expect(enabledOf('Start Gateway')).toBe(true);

    menu.reflectEngineStates({ personal: { status: 'running' } });

    expect(enabledOf('Stop Gateway')).toBe(true);
    expect(enabledOf('Start Gateway')).toBe(false);

    press('Stop Gateway');

    expect(taken).toEqual(['stop personal']);
  });

  test('a push that changes nothing the menu reads repaints nothing', async () => {
    const menu = await standingConduct();

    menu.standOnUrl(DETAIL);

    const painted = desktop.installed.length;

    menu.reflectEngineStates({ another: { status: 'running' } });

    expect(desktop.installed.length).toBe(painted);
  });
});

describe('the surface and words a window stands on', () => {
  test('a providers address ticks Providers and brings no route menu', async () => {
    const menu = await standingConduct();

    menu.standOnUrl(PROVIDERS);

    expect(tickOf('Providers')).toBe(true);
    expect(tickOf('Gateways')).toBe(false);
    expect(topLevel('Gateway')).toBeUndefined();
    expect(topLevel('Usage')).toBeUndefined();
  });

  test('a usage address carries its range and metric into the ticks', async () => {
    const menu = await standingConduct();

    menu.standOnUrl(USAGE_SPEND);

    expect(tickOf('This Week')).toBe(true);
    expect(tickOf('Last 24 Hours')).toBe(false);
    expect(tickOf('Spend')).toBe(true);
  });

  test('a saved retention window reaches the range dimming', async () => {
    const menu = await standingConduct();

    menu.reflectSettings({ ...defaultSettings(), usageRetentionDays: 7 });
    menu.standOnUrl(USAGE_SPEND);

    expect(enabledOf('Last 30 Days')).toBe(false);
    expect(enabledOf('Last 7 Days')).toBe(true);
  });
});
