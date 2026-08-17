import type { UpdateState } from '@recompose/contracts';

import { app } from 'electron';
import { autoUpdater } from 'electron-updater';

import { devFeedPort, wireUpdatesFor, type UpdatesWiring } from './updates-wiring';

/**
 * @summary electron-updater resolves its platform updater the moment it loads, so only this module
 * names the package and everything else stays testable without Electron.
 */
export function wireDesktopUpdates(push: (state: UpdateState) => void): UpdatesWiring {
  return wireUpdatesFor({
    platform: process.platform,
    env: process.env,
    isPackaged: app.isPackaged,
    inApplicationsFolder: process.platform !== 'darwin' || app.isInApplicationsFolder(),
    openPort: () => devFeedPort(autoUpdater, process.env),
    push,
  });
}
