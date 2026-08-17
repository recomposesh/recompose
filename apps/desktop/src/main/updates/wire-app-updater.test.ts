import type { UpdateState } from '@recompose/contracts';

import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { updateLogFor, type UpdaterLogger } from './update-log';
import { wireAppUpdater } from './wire-app-updater';

class FakeUpdater extends EventEmitter {
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

function wired(intervalMs = 60_000) {
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

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('wiring the updater', () => {
  test('checks once at wire time without being awaited', () => {
    const { updater } = wired();

    expect(updater.checks).toBe(1);
  });

  test('sets the quit-installs decision and the logger on the port', () => {
    const { updater } = wired();

    expect(updater.autoInstallOnAppQuit).toBe(true);
    expect(updater.logger).not.toBeNull();
  });

  test('an error emitted with no check in flight leaves the process running and reaches the log', () => {
    const lines: string[] = [];

    vi.spyOn(console, 'warn').mockImplementation((line: unknown) => {
      lines.push(String(line));
    });

    const { updater, wiring } = wired();

    expect(() => updater.emit('error', new Error('feed refused'))).not.toThrow();
    expect(wiring.state()).toEqual({ standing: 'quiet' });
    expect(lines).toEqual(['update check failed: feed refused (feed: https://releases.example)']);
  });

  test('a rejected check reaches the log once', async () => {
    const lines: string[] = [];

    vi.spyOn(console, 'warn').mockImplementation((line: unknown) => {
      lines.push(String(line));
    });

    const updater = new FakeUpdater();

    updater.answerCheck = async () => Promise.reject(new Error('offline'));

    wireAppUpdater({
      updater,
      log: updateLogFor('https://releases.example'),
      push: () => undefined,
      intervalMs: 60_000,
    });

    await vi.waitFor(() => {
      expect(lines).toEqual(['update check failed: offline (feed: https://releases.example)']);
    });
  });
});

describe('the held state follows the fold and pushes on movement alone', () => {
  test('an announced then landed version pushes downloading then ready', () => {
    const { updater, pushed, wiring } = wired();

    updater.emit('update-available', { version: '0.4.0' });
    updater.emit('update-downloaded', { version: '0.4.0' });
    updater.emit('update-available', { version: '0.5.0' });

    expect(pushed).toEqual([
      { standing: 'downloading', version: '0.4.0' },
      { standing: 'ready', version: '0.4.0' },
    ]);
    expect(wiring.state()).toEqual({ standing: 'ready', version: '0.4.0' });
  });
});

describe('what pushes and what stays quiet', () => {
  test('a re-announced version pushes nothing, and a newer one pushes again', () => {
    const { updater, pushed } = wired();

    updater.emit('update-available', { version: '0.4.0' });
    updater.emit('update-available', { version: '0.4.0' });
    updater.emit('update-available', { version: '0.5.0' });

    expect(pushed).toEqual([
      { standing: 'downloading', version: '0.4.0' },
      { standing: 'downloading', version: '0.5.0' },
    ]);
  });

  test('a failure mid-download settles the card back to quiet', () => {
    const { updater, pushed } = wired();

    updater.emit('update-available', { version: '0.4.0' });
    updater.emit('error', new Error('the feed went away'));

    expect(pushed).toEqual([{ standing: 'downloading', version: '0.4.0' }, { standing: 'quiet' }]);
  });

  test('a cancelled download settles back, and a later find downloads again', () => {
    const { updater, pushed } = wired();

    updater.emit('update-available', { version: '0.4.0' });
    updater.emit('update-cancelled', { version: '0.4.0' });
    updater.emit('update-available', { version: '0.4.0' });

    expect(pushed).toEqual([
      { standing: 'downloading', version: '0.4.0' },
      { standing: 'quiet' },
      { standing: 'downloading', version: '0.4.0' },
    ]);
  });
});

describe('a check the boundary refuses without an Error', () => {
  test('still reaches the log whole', async () => {
    const lines: string[] = [];

    vi.spyOn(console, 'warn').mockImplementation((line: unknown) => {
      lines.push(String(line));
    });

    const updater = new FakeUpdater();
    const boundaryReason: unknown = 'the socket fell over';

    updater.answerCheck = () => {
      throw boundaryReason;
    };

    wireAppUpdater({
      updater,
      log: updateLogFor('https://releases.example'),
      push: () => undefined,
      intervalMs: 60_000,
    });

    await vi.waitFor(() => {
      expect(lines).toEqual([
        'update check failed: the socket fell over (feed: https://releases.example)',
      ]);
    });
  });
});

describe('the restart', () => {
  test('installs only while ready', () => {
    const { updater, wiring } = wired();

    expect(wiring.restart()).toBe(false);
    expect(updater.installs).toBe(0);

    updater.emit('update-available', { version: '0.4.0' });
    updater.emit('update-downloaded', { version: '0.4.0' });

    expect(wiring.restart()).toBe(true);
    expect(updater.installs).toBe(1);
  });
});

describe('the interval', () => {
  test('keeps checking until ready holds, then stops', () => {
    vi.useFakeTimers();

    const { updater } = wired(1_000);

    vi.advanceTimersByTime(3_000);

    expect(updater.checks).toBe(4);

    updater.emit('update-available', { version: '0.4.0' });
    updater.emit('update-downloaded', { version: '0.4.0' });
    vi.advanceTimersByTime(5_000);

    expect(updater.checks).toBe(4);
  });

  test('disposal clears it', () => {
    vi.useFakeTimers();

    const { updater, wiring } = wired(1_000);

    wiring.dispose();
    vi.advanceTimersByTime(5_000);

    expect(updater.checks).toBe(1);
  });
});
