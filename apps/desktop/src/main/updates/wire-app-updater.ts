import type { UpdateState } from '@recompose/contracts';

import type { HeardUpdate } from './update-hold';
import type { UpdateLog, UpdaterLogger } from './update-log';

import { holdUpdateState } from './update-hold';

type VersionInfo = { version: string };

type HeardUpdaterEvent = ((event: 'error', listener: (error: Error) => void) => unknown) &
  ((event: 'update-available', listener: (info: VersionInfo) => void) => unknown) &
  ((event: 'update-not-available', listener: (info: VersionInfo) => void) => unknown) &
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
  /** Runs a check for the person, which is the only check that reports its outcome. */
  checkNow: () => void;
  restart: () => boolean;
  dispose: () => void;
};

function reasonOf(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

function heardSignals(
  updater: UpdaterPort,
  log: UpdateLog,
  heard: (word: HeardUpdate) => void,
): void {
  updater.on('error', (error) => {
    log.failed('check', error.message);
    heard({
      check: { standing: 'failed', reason: error.message },
      signal: { kind: 'failed', reason: error.message },
    });
  });
  updater.on('update-available', (info) => {
    heard({
      check: { standing: 'found', version: info.version },
      signal: { kind: 'available', version: info.version },
    });
  });
  updater.on('update-not-available', () => {
    heard({ check: { standing: 'current' } });
  });
  updater.on('update-downloaded', (info) => {
    heard({ signal: { kind: 'downloaded', version: info.version } });
  });
  updater.on('update-cancelled', () => {
    heard({ signal: { kind: 'cancelled' } });
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
  const held = holdUpdateState(push);

  heardSignals(updater, log, held.hear);

  updater.autoInstallOnAppQuit = true;
  updater.logger = log.logger;

  const ranCheck = (): void => {
    void updater.checkForUpdates().catch((cause: unknown) => {
      const reason = reasonOf(cause);

      log.failed('check', reason);
      held.hear({ check: { standing: 'failed', reason } });
    });
  };

  ranCheck();

  const interval = setInterval(() => {
    if (held.state().standing !== 'ready' && !held.asking()) {
      ranCheck();
    }
  }, intervalMs);

  return {
    state: held.state,
    checkNow: () => {
      if (held.ask()) {
        ranCheck();
      }
    },
    restart: () => {
      if (held.state().standing !== 'ready') {
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
