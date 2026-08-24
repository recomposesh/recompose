import { describe, expect, test } from 'vitest';

import type { SystemIpcContext } from './system-ipc';

import { createSystemIpcHandlers } from './system-ipc';

const configFolder = '/home/someone/.config/recompose';

function systemContext(overrides: Partial<SystemIpcContext> = {}): SystemIpcContext {
  return {
    fileBrowser: 'finder',
    windowControls: 'leading',
    shortcutKey: 'command',
    loginItem: 'available',
    configFolder,
    homeFolder: '/home/someone',
    appVersion: '0.3.0',
    readLoginItem: () => false,
    isMenuBarVisible: () => false,
    openFolder: async () => Promise.resolve(''),
    placeWindowButtons: () => undefined,
    answerTitleBarDoubleClick: () => undefined,
    noteLogsDrawer: () => undefined,
    noteSurfaceToggles: () => undefined,
    ...overrides,
  };
}

describe('what the renderer tells main about the standing surfaces', () => {
  test('one snapshot carries all three standings to the menu ticks', async () => {
    const snapshots: { sidebar: boolean; inspector: boolean; modal: boolean }[] = [];
    const handlers = createSystemIpcHandlers(
      systemContext({
        noteSurfaceToggles: (toggles) => {
          snapshots.push(toggles);
        },
      }),
    );

    await expect(
      handlers['system:surface-toggles']({ sidebar: true, inspector: false, modal: false }),
    ).resolves.toEqual({ ok: true, value: undefined });
    await handlers['system:surface-toggles']({ sidebar: false, inspector: true, modal: true });

    expect(snapshots).toEqual([
      { sidebar: true, inspector: false, modal: false },
      { sidebar: false, inspector: true, modal: true },
    ]);
  });
});

describe('what the renderer tells main about the logs drawer', () => {
  test('the standing reaches the menu either way, so the tick follows the drawer', async () => {
    const standings: boolean[] = [];
    const handlers = createSystemIpcHandlers(
      systemContext({
        noteLogsDrawer: (open) => {
          standings.push(open);
        },
      }),
    );

    await expect(handlers['system:logs-drawer']({ open: true })).resolves.toEqual({
      ok: true,
      value: undefined,
    });
    await handlers['system:logs-drawer']({ open: false });

    expect(standings).toEqual([true, false]);
  });
});

describe('the machine words the reading carries', () => {
  test('carries the file browser, the login item, the menu bar, and the config folder', async () => {
    const handlers = createSystemIpcHandlers(
      systemContext({
        fileBrowser: 'explorer',
        windowControls: 'trailing',
        shortcutKey: 'control',
        loginItem: 'unpackaged',
        readLoginItem: () => true,
        isMenuBarVisible: () => true,
      }),
    );

    expect(await handlers['system:get'](undefined)).toEqual({
      ok: true,
      value: {
        fileBrowser: 'explorer',
        windowControls: 'trailing',
        shortcutKey: 'control',
        loginItem: 'unpackaged',
        loginItemEnabled: true,
        menuBarVisible: true,
        configFolder: '~/.config/recompose',
        version: '0.3.0',
      },
    });
  });
});

describe('the system state behind the settings screen', () => {
  test('names the running version the packaging stamped', async () => {
    const handlers = createSystemIpcHandlers(systemContext({ appVersion: '0.4.0' }));

    const reading = await handlers['system:get'](undefined);

    expect(reading).toMatchObject({ ok: true, value: { version: '0.4.0' } });
  });

  test('reports the operating system login item as it stands on each fetch', async () => {
    let enabledInOperatingSystem = false;
    const handlers = createSystemIpcHandlers(
      systemContext({ readLoginItem: () => enabledInOperatingSystem }),
    );

    const before = await handlers['system:get'](undefined);

    enabledInOperatingSystem = true;

    const after = await handlers['system:get'](undefined);

    expect(before).toMatchObject({ ok: true, value: { loginItemEnabled: false } });
    expect(after).toMatchObject({ ok: true, value: { loginItemEnabled: true } });
  });

  test('reports the menu bar as it stands on each fetch', async () => {
    let trayShowing = false;
    const handlers = createSystemIpcHandlers(
      systemContext({ isMenuBarVisible: () => trayShowing }),
    );

    const before = await handlers['system:get'](undefined);

    trayShowing = true;

    const after = await handlers['system:get'](undefined);

    expect(before).toMatchObject({ ok: true, value: { menuBarVisible: false } });
    expect(after).toMatchObject({ ok: true, value: { menuBarVisible: true } });
  });
});

describe('a double-click on the title bar', () => {
  test('is carried through to the window action the renderer cannot reach', async () => {
    let answered = 0;
    const handlers = createSystemIpcHandlers(
      systemContext({
        answerTitleBarDoubleClick: () => {
          answered += 1;
        },
      }),
    );

    const result = await handlers['system:title-bar-double-click'](undefined);

    expect(answered).toBe(1);
    expect(result).toEqual({ ok: true, value: undefined });
  });
});

describe('the band the window controls sit over', () => {
  test('each band centers the controls in its own height', async () => {
    const placements: { x: number; y: number }[] = [];
    const handlers = createSystemIpcHandlers(
      systemContext({
        placeWindowButtons: (position) => {
          placements.push(position);
        },
      }),
    );

    const answer = await handlers['system:window-band']('sidebar');

    await handlers['system:window-band']('toolbar');

    expect(answer).toEqual({ ok: true, value: undefined });
    expect(placements).toEqual([
      { x: 14, y: 12 },
      { x: 14, y: 21 },
    ]);
  });
});

describe('opening the config folder', () => {
  test('hands the file browser the folder the state names', async () => {
    const opened: string[] = [];
    const handlers = createSystemIpcHandlers(
      systemContext({
        openFolder: async (path) => {
          opened.push(path);

          return Promise.resolve('');
        },
      }),
    );

    const result = await handlers['system:open-config-folder'](undefined);

    expect(opened).toEqual([configFolder]);
    expect(result).toEqual({ ok: true, value: undefined });
  });

  test('a refusal from the operating system arrives as a typed failure carrying its reason', async () => {
    const handlers = createSystemIpcHandlers(
      systemContext({ openFolder: async () => Promise.resolve('Failed to open path') }),
    );

    expect(await handlers['system:open-config-folder'](undefined)).toEqual({
      ok: false,
      error: {
        code: 'folder-open-failed',
        message: 'could not open the config folder: Failed to open path',
      },
    });
  });
});
