import { app, BrowserWindow } from 'electron';

import { hideMenuBarTray, isMenuBarTrayVisible } from './tray/menu-bar-tray';
import { shouldQuitOnLastWindowClose } from './windows/quit-policy';

type AppLifecycle = {
  /**
   * Brings the app up, asking `stillWanted` after anything it waited on.
   *
   * @summary A quit can arrive while a start is still waiting, and disposal tears down the very
   * state the rest of the start would reach for. Answering false is the start's cue to stop where
   * it stands rather than raise on what disposal already took away.
   */
  start: (stillWanted: () => boolean) => Promise<void>;
  activate: () => void;
  dispose: () => void;
};

export function registerAppLifecycle(lifecycle: AppLifecycle): void {
  let quitting = false;

  void app
    .whenReady()
    .then(async () => lifecycle.start(() => !quitting))
    .catch((error: unknown) => {
      console.error('recompose failed to start', error);
    });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      lifecycle.activate();
    }
  });

  app.on('before-quit', () => {
    quitting = true;
    hideMenuBarTray();
    lifecycle.dispose();
  });
  app.on('window-all-closed', () => {
    if (shouldQuitOnLastWindowClose(process.platform, isMenuBarTrayVisible())) {
      app.quit();
    }
  });
}
