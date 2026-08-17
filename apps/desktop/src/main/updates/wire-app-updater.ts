import type { UpdateState } from '@recompose/contracts';

import type { UpdateLog, UpdaterLogger } from './update-log';

import { nextUpdateState, type UpdaterSignal } from './update-standing';

type VersionInfo = { version: string };

type UpdaterPortEvents = {
  error: (error: Error) => void;
  'checking-for-update': () => void;
  'update-available': (info: VersionInfo) => void;
  'update-not-available': (info: VersionInfo) => void;
  'update-downloaded': (info: VersionInfo) => void;
  'update-cancelled': (info: VersionInfo) => void;
};

export type UpdaterPort = {
  autoInstallOnAppQuit: boolean;
  logger: UpdaterLogger | null;
  on: <Event extends keyof UpdaterPortEvents>(
    event: Event,
    listener: UpdaterPortEvents[Event],
  ) => unknown;
  checkForUpdates: () => Promise<unknown>;
  quitAndInstall: () => void;
};

export type WiredUpdater = {
  state: () => UpdateState;
  restart: () => boolean;
  dispose: () => void;
};

function sameStanding(one: UpdateState, other: UpdateState): boolean {
  if (one.standing === 'quiet' || other.standing === 'quiet') {
    return one.standing === other.standing;
  }

  return one.standing === other.standing && one.version === other.version;
}

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
  updater.on('checking-for-update', () => {
    folded({ kind: 'checking' });
  });
  updater.on('update-available', (info) => {
    folded({ kind: 'available', version: info.version });
  });
  updater.on('update-not-available', () => {
    folded({ kind: 'not-available' });
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
 * @summary The error listener attaches before the first check, unconditionally: an unlistened
 * error event would take the main process down, so the spec's "a failed check leaves the app
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

    if (sameStanding(held, next)) {
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
