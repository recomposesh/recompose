import { describe, expect, test } from 'vitest';

import { ipcChannels, systemStateSchema } from './ipc';

const observedSystemState = {
  fileBrowser: 'finder',
  loginItem: 'available',
  loginItemEnabled: true,
  menuBarVisible: false,
  configFolder: '/Users/someone/Library/Application Support/recompose',
  version: '0.3.0',
  windowControls: 'leading',
  shortcutKey: 'command',
};

describe('the system state crossing the bridge', () => {
  test('a full reading round-trips', () => {
    expect(
      ipcChannels['system:get'].response.parse({ ok: true, value: observedSystemState }),
    ).toEqual({ ok: true, value: observedSystemState });
  });

  test('the reading always names the running version', () => {
    expect(() => systemStateSchema.parse({ ...observedSystemState, version: '' })).toThrow();
  });

  test('a blank config folder is rejected', () => {
    expect(() =>
      systemStateSchema.parse({ ...observedSystemState, configFolder: '   ' }),
    ).toThrow();
  });

  test('the platform never rides along', () => {
    expect(() => systemStateSchema.parse({ ...observedSystemState, platform: 'darwin' })).toThrow();
  });
});

describe('the platform words the reading carries instead of the platform', () => {
  test('the file browser and the login-item availability are closed sets', () => {
    expect(() =>
      systemStateSchema.parse({ ...observedSystemState, fileBrowser: 'nautilus' }),
    ).toThrow();
    expect(() => systemStateSchema.parse({ ...observedSystemState, loginItem: 'maybe' })).toThrow();
  });

  test('every platform reads its own file browser and login-item standing', () => {
    for (const fileBrowser of ['finder', 'explorer', 'file-manager']) {
      for (const loginItem of ['available', 'unpackaged', 'unsupported']) {
        const reading = { ...observedSystemState, fileBrowser, loginItem };

        expect(systemStateSchema.parse(reading)).toEqual(reading);
      }
    }
  });

  test('every platform reads which edge its window controls take', () => {
    for (const windowControls of ['leading', 'trailing', 'none']) {
      const reading = { ...observedSystemState, windowControls };

      expect(systemStateSchema.parse(reading)).toEqual(reading);
    }

    expect(() =>
      systemStateSchema.parse({ ...observedSystemState, windowControls: 'top' }),
    ).toThrow();
  });

  test('every platform reads the modifier its shortcuts print', () => {
    for (const shortcutKey of ['command', 'control']) {
      const reading = { ...observedSystemState, shortcutKey };

      expect(systemStateSchema.parse(reading)).toEqual(reading);
    }

    expect(() =>
      systemStateSchema.parse({ ...observedSystemState, shortcutKey: 'meta' }),
    ).toThrow();
  });
});
