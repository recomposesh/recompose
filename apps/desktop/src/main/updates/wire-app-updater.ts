import type { UpdateState } from '@recompose/contracts';

import type { UpdateLog, UpdaterLogger } from './update-log';

import { nextUpdateState, type UpdaterSignal } from './update-standing';

type VersionInfo = { version: string };

type HeardUpdaterEvent = ((event: 'error', listener: (error: Error) => void) => unknown) &
  ((event: 'update-available', listener: (info: VersionInfo) => void) => unknown) &
  ((event: 'update-downloaded', listener: (info: VersionInfo) => void) => unknown) &
  ((event: 'update-cancelled', listener: (info: VersionInfo) => void) => unknown);

export type UpdaterPort = {
  autoInstallOnAppQuit: boolean;
  logger: UpdaterLogger | null;
  on: HeardUpdaterEvent;
  checkForUpdates: () => Promise<unknown>;
  quitAndInstall: () => void;
};

export type WiredUpdater = {
  state: () => UpdateState;
  restart: () => boolean;
  dispose: () => void;
};

function reasonOf(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

function heardSignals(
  updater: UpdaterPort,
  log: UpdateLog,
  folded: (signal: UpdaterSignal) => void,
): void {
  updater.on('error', (error) => {
    log.failed('check', error.message);
    folded({ kind: 'failed', reason: error.message });
  });
  updater.on('update-available', (info) => {
    folded({ kind: 'available', version: info.version });
  });
  updater.on('update-downloaded', (info) => {
    folded({ kind: 'downloaded', version: info.version });
  });
  updater.on('update-cancelled', () => {
    folded({ kind: 'cancelled' });
  });
}

/**
 * The one place the updater meets the app.
 *
 * @summary The error listener attaches before the first check, unconditionally: an error event
 * with no listener would take the main process down, so the spec's "a failed check leaves the app
 * running" is decided by this ordering rather than by any interface.
 */
export function wireAppUpdater(deps: {
  updater: UpdaterPort;
  log: UpdateLog;
  push: (state: UpdateState) => void;
  intervalMs: number;
}): WiredUpdater {
  const { updater, log, push, intervalMs } = deps;
  let held: UpdateState = { standing: 'quiet' };

  const folded = (signal: UpdaterSignal): void => {
    const next = nextUpdateState(held, signal);

    if (next === held) {
      return;
    }

    held = next;
    push(next);
  };

  heardSignals(updater, log, folded);

  updater.autoInstallOnAppQuit = true;
  updater.logger = log.logger;

  const checkQuietly = (): void => {
    void updater.checkForUpdates().catch((cause: unknown) => {
      log.failed('check', reasonOf(cause));
    });
  };

  checkQuietly();

  const interval = setInterval(() => {
    if (held.standing !== 'ready') {
      checkQuietly();
    }
  }, intervalMs);

  return {
    state: () => held,
    restart: () => {
      if (held.standing !== 'ready') {
        return false;
      }

      updater.quitAndInstall();

      return true;
    },
    dispose: () => {
      clearInterval(interval);
    },
  };
}
