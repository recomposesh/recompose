import { nativeTheme } from 'electron';

import type { SettingsEffects } from './apply-settings';

type EffectSeams = {
  showTray: () => void;
  hideTray: () => void;
  setLoginItem: (enabled: boolean) => void;
};

export function createSettingsEffects(seams: EffectSeams): SettingsEffects {
  return {
    setThemeSource: (theme) => {
      nativeTheme.themeSource = theme;
    },
    setMenuBarVisible: (visible) => {
      if (visible) {
        seams.showTray();
      } else {
        seams.hideTray();
      }
    },
    setLoginItem: seams.setLoginItem,
  };
}
