import type { BrowserWindowConstructorOptions } from 'electron';

import type { WindowScheme } from './title-bar-overlay';

import { titleBarOverlayFor } from './title-bar-overlay';
import { windowButtonsFor } from './window-buttons';

export function windowOptionsFor(
  platform: NodeJS.Platform,
  preloadPath: string,
  iconPath: string,
  scheme: WindowScheme,
): BrowserWindowConstructorOptions {
  return {
    width: 1120,
    height: 780,
    minWidth: 720,
    minHeight: 500,
    show: false,
    autoHideMenuBar: true,
    ...(platform === 'darwin'
      ? {
          transparent: true,
          titleBarStyle: 'hidden' as const,
          trafficLightPosition: windowButtonsFor('sidebar'),
        }
      : {}),
    ...(platform === 'win32'
      ? { titleBarStyle: 'hidden' as const, titleBarOverlay: titleBarOverlayFor(scheme) }
      : {}),
    ...(platform === 'linux' ? { icon: iconPath } : {}),
    webPreferences: {
      preload: preloadPath,
      sandbox: true,
    },
  };
}
