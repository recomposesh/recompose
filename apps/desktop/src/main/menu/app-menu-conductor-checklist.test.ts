import type { Settings } from '@recompose/contracts';

import { defaultSettings } from '@recompose/contracts';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { AppMenuItem } from './app-menu-template';

import { loadSettingsFile } from '../storage/settings-store';
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

const { itemNamed, press } = menuProbe(desktop);

beforeEach(() => {
  desktop.installed = [];
});

afterEach(() => {
  vi.restoreAllMocks();
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
