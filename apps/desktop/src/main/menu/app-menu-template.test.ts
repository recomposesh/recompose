import { describe, expect, test } from 'vitest';

import { buildAppMenuTemplate } from './app-menu-template';
import {
  atGatewayDetail,
  atHome,
  everyPlatform,
  idleHandlers,
  itemLabelled,
  menuLabelled,
  recordingHandlers,
  shapeOf,
} from './app-menu-template.testkit';

describe('the settings shortcut on the application menu', () => {
  test('macOS carries it in the application menu, where its readers look for it', () => {
    const [applicationMenu] = buildAppMenuTemplate('darwin', idleHandlers, atHome);

    expect(itemLabelled(applicationMenu?.submenu ?? [], 'Settings…')?.accelerator).toBe(
      'CmdOrCtrl+,',
    );
  });

  test('Windows and Linux carry it in the File menu, where their readers look for it', () => {
    const fileMenu = menuLabelled(buildAppMenuTemplate('win32', idleHandlers, atHome), 'File');

    expect(itemLabelled(fileMenu?.submenu ?? [], 'Settings…')?.accelerator).toBe('CmdOrCtrl+,');
  });

  test('choosing it reaches the settings surface', () => {
    const taken: string[] = [];

    itemLabelled(
      buildAppMenuTemplate('linux', recordingHandlers(taken), atHome),
      'Settings…',
    )?.click?.();

    expect(taken).toEqual(['open-settings']);
  });
});

describe('creating a gateway from the menu bar', () => {
  test('every platform offers it under File, on the shortcut a new document uses', () => {
    for (const platform of everyPlatform) {
      const fileMenu = menuLabelled(buildAppMenuTemplate(platform, idleHandlers, atHome), 'File');

      expect(itemLabelled(fileMenu?.submenu ?? [], 'New Gateway…')?.accelerator).toBe(
        'CmdOrCtrl+N',
      );
    }
  });

  test('choosing it opens the creation sheet', () => {
    const taken: string[] = [];

    itemLabelled(
      buildAppMenuTemplate('darwin', recordingHandlers(taken), atHome),
      'New Gateway…',
    )?.click?.();

    expect(taken).toEqual(['new-gateway']);
  });
});

describe('the onboarding checklist toggle', () => {
  test('the tick reads the checklist standing', () => {
    for (const shown of [true, false]) {
      const item = itemLabelled(
        buildAppMenuTemplate('darwin', idleHandlers, { ...atHome, checklistShown: shown }),
        'Show Onboarding Checklist',
      );

      expect(item?.type).toBe('checkbox');
      expect(item?.checked).toBe(shown);
    }
  });

  test('choosing it asks for the standing the checklist does not hold', () => {
    const shownTaken: string[] = [];
    const hiddenTaken: string[] = [];

    itemLabelled(
      buildAppMenuTemplate('darwin', recordingHandlers(shownTaken), atHome),
      'Show Onboarding Checklist',
    )?.click?.();
    itemLabelled(
      buildAppMenuTemplate('darwin', recordingHandlers(hiddenTaken), {
        ...atHome,
        checklistShown: false,
      }),
      'Show Onboarding Checklist',
    )?.click?.();

    expect(shownTaken).toEqual(['show-checklist false']);
    expect(hiddenTaken).toEqual(['show-checklist true']);
  });
});

describe('the order the menus stand in', () => {
  test('macOS orders its menus the way every Mac app does, Help trailing', () => {
    expect(shapeOf(buildAppMenuTemplate('darwin', idleHandlers, atHome))).toEqual([
      'Recompose',
      'File',
      'editMenu',
      'View',
      'windowMenu',
      'help',
    ]);
    expect(shapeOf(buildAppMenuTemplate('darwin', idleHandlers, atGatewayDetail))).toEqual([
      'Recompose',
      'File',
      'editMenu',
      'View',
      'Gateway',
      'windowMenu',
      'help',
    ]);
  });

  test('Windows and Linux lead with File and keep the rest beside it', () => {
    for (const platform of ['win32', 'linux'] satisfies NodeJS.Platform[]) {
      expect(shapeOf(buildAppMenuTemplate(platform, idleHandlers, atGatewayDetail))).toEqual([
        'File',
        'editMenu',
        'View',
        'Gateway',
        'windowMenu',
        'Help',
      ]);
    }
  });
});

describe('what a custom application menu must not drop', () => {
  test('macOS keeps the whole application menu around the settings group', () => {
    const [applicationMenu] = buildAppMenuTemplate('darwin', idleHandlers, atHome);

    expect(applicationMenu?.label).toBe('Recompose');
    expect(shapeOf(applicationMenu?.submenu ?? [])).toEqual([
      'about',
      'Check for Updates…',
      'separator',
      'Settings…',
      'separator',
      'services',
      'separator',
      'hide',
      'hideOthers',
      'unhide',
      'separator',
      'quit',
    ]);
  });

  test('macOS keeps File to the document actions, because quitting lives in its own menu', () => {
    const fileMenu = menuLabelled(buildAppMenuTemplate('darwin', idleHandlers, atHome), 'File');

    expect(shapeOf(fileMenu?.submenu ?? [])).toEqual(['New Gateway…', 'separator', 'close']);
  });

  test('Windows and Linux keep the settings item and the way out under File', () => {
    const fileMenu = menuLabelled(buildAppMenuTemplate('linux', idleHandlers, atHome), 'File');

    expect(shapeOf(fileMenu?.submenu ?? [])).toEqual([
      'New Gateway…',
      'separator',
      'Settings…',
      'separator',
      'quit',
    ]);
  });
});
