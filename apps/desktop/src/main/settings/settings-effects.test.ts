import type { Settings } from '@recompose/contracts';

import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { SettingsEffects } from './apply-settings';

import { createSettingsEffects } from './settings-effects';

const desktop = vi.hoisted((): { themeSource: string } => ({ themeSource: 'system' }));

vi.mock('electron', () => ({ nativeTheme: desktop }));

type Applied = {
  effects: SettingsEffects;
  tray: ('shown' | 'hidden')[];
  loginItem: boolean[];
};

function applyOver(): Applied {
  const tray: ('shown' | 'hidden')[] = [];
  const loginItem: boolean[] = [];

  const effects = createSettingsEffects({
    showTray: () => {
      tray.push('shown');
    },
    hideTray: () => {
      tray.push('hidden');
    },
    setLoginItem: (enabled) => {
      loginItem.push(enabled);
    },
  });

  return { effects, tray, loginItem };
}

beforeEach(() => {
  desktop.themeSource = 'system';
});

describe('carrying a chosen appearance to the operating system', () => {
  test('a chosen theme becomes the theme the machine paints with', () => {
    const applied = applyOver();
    const dark: Settings['theme'] = 'dark';

    applied.effects.setThemeSource(dark);

    expect(desktop.themeSource).toBe('dark');
  });
});

describe('carrying the menu bar choice to the tray', () => {
  test('asking for the menu bar puts the tray up', () => {
    const applied = applyOver();

    applied.effects.setMenuBarVisible(true);

    expect(applied.tray).toEqual(['shown']);
  });

  test('turning the menu bar off takes the tray down', () => {
    const applied = applyOver();

    applied.effects.setMenuBarVisible(false);

    expect(applied.tray).toEqual(['hidden']);
  });
});

describe('carrying the launch choice to the login items', () => {
  test('the choice reaches the machine exactly as it was made', () => {
    const applied = applyOver();

    applied.effects.setLoginItem(true);
    applied.effects.setLoginItem(false);

    expect(applied.loginItem).toEqual([true, false]);
  });
});
