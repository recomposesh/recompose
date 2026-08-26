import type { UpdateState } from '@recompose/contracts';

import { EventEmitter } from 'node:events';
import { vi } from 'vitest';

import { updateLogFor, type UpdaterLogger } from './update-log';
import { wireAppUpdater } from './wire-app-updater';

/**
 * The auto-updater port a spec drives, standing in for the one electron-updater ships.
 *
 * @summary Four specs drive the same wiring from different ends, and each of them needs a port it
 * can emit into and count checks on. Keeping the stand-in here means no spec carries another's
 * setup, and every spec reads the same fake against the same wiring.
 */
export class FakeUpdater extends EventEmitter {
  autoInstallOnAppQuit = false;

  logger: UpdaterLogger | null = null;

  checks = 0;

  installs = 0;

  answerCheck: () => Promise<unknown> = async () => Promise.resolve(null);

  async checkForUpdates(): Promise<unknown> {
    this.checks += 1;

    return this.answerCheck();
  }

  quitAndInstall(): void {
    this.installs += 1;
  }
}

export function wired(intervalMs = 60_000) {
  const updater = new FakeUpdater();
  const pushed: UpdateState[] = [];
  const wiring = wireAppUpdater({
    updater,
    log: updateLogFor('https://releases.example'),
    push: (state) => {
      pushed.push(state);
    },
    intervalMs,
  });

  return { updater, pushed, wiring };
}

export async function everyPendingTurn(): Promise<void> {
  await new Promise((resolve) => {
    setImmediate(resolve);
  });
}

export function warningLines(): string[] {
  const lines: string[] = [];

  vi.spyOn(console, 'warn').mockImplementation((line: unknown) => {
    lines.push(String(line));
  });

  return lines;
}
