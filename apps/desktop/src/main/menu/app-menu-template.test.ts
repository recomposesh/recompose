import { describe, expect, test } from 'vitest';

import type { AppMenuHandlers, AppMenuItem, AppMenuView } from './app-menu-template';

import { buildAppMenuTemplate } from './app-menu-template';

function everyItem(template: AppMenuItem[]): AppMenuItem[] {
  return template.flatMap((item) => [item, ...everyItem(item.submenu ?? [])]);
}

function itemLabelled(template: AppMenuItem[], label: string): AppMenuItem | undefined {
  return everyItem(template).find((item) => item.label === label);
}

function menuLabelled(template: AppMenuItem[], label: string): AppMenuItem | undefined {
  return template.find((item) => item.label === label);
}

function shapeOf(items: AppMenuItem[]): (string | undefined)[] {
  return items.map((item) => item.role ?? item.label ?? item.type);
}

function recordingHandlers(taken: string[]): AppMenuHandlers {
  return {
    onOpenSettings: () => {
      taken.push('open-settings');
    },
    onNewGateway: () => {
      taken.push('new-gateway');
    },
    onToggleChecklist: (shown) => {
      taken.push(`show-checklist ${String(shown)}`);
    },
    onCanvasCommand: (command) => {
      taken.push(command);
    },
  };
}

const idleHandlers = recordingHandlers([]);
const atHome: AppMenuView = { checklistShown: true, onGatewayDetail: false };
const atGatewayDetail: AppMenuView = { checklistShown: true, onGatewayDetail: true };
const everyPlatform: NodeJS.Platform[] = ['darwin', 'win32', 'linux'];

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
  test('macOS carries it in the application menu beside the settings item', () => {
    const [applicationMenu] = buildAppMenuTemplate('darwin', idleHandlers, atHome);

    expect(itemLabelled(applicationMenu?.submenu ?? [], 'Show Onboarding Checklist')).toBeDefined();
  });

  test('Windows and Linux carry it under View', () => {
    for (const platform of ['win32', 'linux'] satisfies NodeJS.Platform[]) {
      const viewMenu = menuLabelled(buildAppMenuTemplate(platform, idleHandlers, atHome), 'View');

      expect(itemLabelled(viewMenu?.submenu ?? [], 'Show Onboarding Checklist')).toBeDefined();
    }
  });

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

describe('driving the canvas from the menu bar', () => {
  test('a gateway surface gathers the canvas acts under Gateway, on the shortcuts zoom means here', () => {
    for (const platform of everyPlatform) {
      const gatewayMenu = menuLabelled(
        buildAppMenuTemplate(platform, idleHandlers, atGatewayDetail),
        'Gateway',
      );

      expect(
        (gatewayMenu?.submenu ?? []).map((item) => [item.label ?? item.type, item.accelerator]),
      ).toEqual([
        ['Zoom In', 'CmdOrCtrl+='],
        ['Zoom Out', 'CmdOrCtrl+-'],
        ['Zoom to Fit', 'CmdOrCtrl+0'],
        ['separator', undefined],
        ['Tidy', undefined],
      ]);
    }
  });

  test('a surface holding no gateway carries no Gateway menu', () => {
    for (const platform of everyPlatform) {
      const template = buildAppMenuTemplate(platform, idleHandlers, atHome);

      expect(menuLabelled(template, 'Gateway')).toBeUndefined();
      expect(menuLabelled(template, 'Canvas')).toBeUndefined();
    }
  });

  test('choosing an act carries its command to the canvas', () => {
    const taken: string[] = [];
    const template = buildAppMenuTemplate('darwin', recordingHandlers(taken), atGatewayDetail);

    for (const label of ['Zoom In', 'Zoom Out', 'Zoom to Fit', 'Tidy']) {
      itemLabelled(template, label)?.click?.();
    }

    expect(taken).toEqual(['zoom-in', 'zoom-out', 'zoom-to-fit', 'tidy']);
  });
});

describe('the order the menus stand in', () => {
  test('macOS orders its menus the way every Mac app does', () => {
    expect(shapeOf(buildAppMenuTemplate('darwin', idleHandlers, atHome))).toEqual([
      'Recompose',
      'File',
      'editMenu',
      'View',
      'windowMenu',
    ]);
    expect(shapeOf(buildAppMenuTemplate('darwin', idleHandlers, atGatewayDetail))).toEqual([
      'Recompose',
      'File',
      'editMenu',
      'View',
      'Gateway',
      'windowMenu',
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
      'separator',
      'Settings…',
      'Show Onboarding Checklist',
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

describe('what the View menu keeps', () => {
  test('reloading and full screen stay, and page zoom stays gone', () => {
    const macView = menuLabelled(buildAppMenuTemplate('darwin', idleHandlers, atHome), 'View');
    const linuxView = menuLabelled(buildAppMenuTemplate('linux', idleHandlers, atHome), 'View');

    expect(shapeOf(macView?.submenu ?? [])).toEqual([
      'reload',
      'forceReload',
      'toggleDevTools',
      'separator',
      'togglefullscreen',
    ]);
    expect(shapeOf(linuxView?.submenu ?? [])).toEqual([
      'Show Onboarding Checklist',
      'separator',
      'reload',
      'forceReload',
      'toggleDevTools',
      'separator',
      'togglefullscreen',
    ]);
  });
});
