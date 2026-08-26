import type { IpcEventPayload, Settings } from '@recompose/contracts';

import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { AppMenuConduct } from './app-menu-conductor';
import type { AppMenuItem } from './app-menu-template';

import { conductAppMenu } from './app-menu-conductor';

export type Conducted = {
  menu: AppMenuConduct;
  settingsFile: string;
  pushed: Settings[];
  commanded: IpcEventPayload<'canvas:command'>[];
  usageCommanded: IpcEventPayload<'usage:command'>[];
  asked: ('settings' | 'new-gateway')[];
};

/**
 * The installed menu a spec reads, bound to the record its own electron mock fills.
 *
 * @summary The record is handed in rather than owned here, because `vi.mock` only reaches the
 * module that calls it, so every spec file installs its own mock and keeps its own record.
 */
export type MenuProbe = {
  installedMenu: () => AppMenuItem[];
  findItem: (items: AppMenuItem[], label: string) => AppMenuItem | undefined;
  itemNamed: (label: string) => AppMenuItem;
  press: (label: string) => void;
};

export async function freshSettingsFile(): Promise<string> {
  return join(await mkdtemp(join(tmpdir(), 'recompose-app-menu-')), 'settings.json');
}

export function conductOver(settingsFile: string): Conducted {
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
    onOpenGateways: () => undefined,
    onOpenProviders: () => undefined,
    onOpenUsage: () => undefined,
    onCanvasCommand: (command) => {
      commanded.push(command);
    },
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
    pushSettings: (settings) => {
      pushed.push(settings);
    },
  });

  return { menu, settingsFile, pushed, commanded, usageCommanded, asked };
}

export function menuProbe(desktop: { installed: AppMenuItem[][] }): MenuProbe {
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

  return { installedMenu, findItem, itemNamed, press };
}
