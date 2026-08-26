import { describe, expect, test } from 'vitest';

import type { AppMenuView } from './app-menu-template';

import { buildAppMenuTemplate } from './app-menu-template';
import {
  atHome,
  everyPlatform,
  idleHandlers,
  itemEnabled,
  itemLabelled,
  menuLabelled,
  recordingHandlers,
  shapeOf,
} from './app-menu-template.testkit';

const CHECK_FOR_UPDATES = 'Check for Updates…';

const whileAsking: AppMenuView = { ...atHome, updateCheck: 'asking' };
const onAnotherToolsChannel: AppMenuView = { ...atHome, updateCheck: 'none' };

describe('where a person finds the update check', () => {
  test('macOS stands it directly under About, above the separator Settings follows', () => {
    const [applicationMenu] = buildAppMenuTemplate('darwin', idleHandlers, atHome);

    expect(shapeOf(applicationMenu?.submenu ?? []).slice(0, 4)).toEqual([
      'about',
      CHECK_FOR_UPDATES,
      'separator',
      'Settings…',
    ]);
  });

  test('Windows and Linux carry it in the Help menu, beside the About item', () => {
    for (const platform of ['win32', 'linux'] as const) {
      const help = menuLabelled(buildAppMenuTemplate(platform, idleHandlers, atHome), 'Help');

      expect(shapeOf(help?.submenu ?? []).slice(-3)).toEqual([
        'separator',
        CHECK_FOR_UPDATES,
        'about',
      ]);
    }
  });

  test('macOS keeps it out of the Help menu, where the application menu already stands it', () => {
    const help = menuLabelled(buildAppMenuTemplate('darwin', idleHandlers, atHome), 'Help');

    expect(itemLabelled(help?.submenu ?? [], CHECK_FOR_UPDATES)).toBeUndefined();
  });
});

describe('choosing the update check', () => {
  test('asks the updater for a check the person will hear about', () => {
    const taken: string[] = [];

    itemLabelled(
      buildAppMenuTemplate('darwin', recordingHandlers(taken), atHome),
      CHECK_FOR_UPDATES,
    )?.click?.();

    expect(taken).toEqual(['check-for-updates']);
  });

  test('it stands unavailable while a check runs, so no one stacks a second', () => {
    for (const platform of everyPlatform) {
      const standing = buildAppMenuTemplate(platform, idleHandlers, whileAsking);
      const idle = buildAppMenuTemplate(platform, idleHandlers, atHome);

      expect(itemEnabled(standing, CHECK_FOR_UPDATES)).toBe(false);
      expect(itemEnabled(idle, CHECK_FOR_UPDATES)).toBe(true);
    }
  });
});

describe('an install another tool updates', () => {
  test('offers no check anywhere, because none of them could ever run', () => {
    for (const platform of everyPlatform) {
      const template = buildAppMenuTemplate(platform, idleHandlers, onAnotherToolsChannel);

      expect(itemLabelled(template, CHECK_FOR_UPDATES)).toBeUndefined();
    }
  });

  test('leaves the Help menu ending on About, with no separator left hanging', () => {
    const help = menuLabelled(
      buildAppMenuTemplate('linux', idleHandlers, onAnotherToolsChannel),
      'Help',
    );

    expect(shapeOf(help?.submenu ?? []).slice(-2)).toEqual(['separator', 'about']);
  });
});
