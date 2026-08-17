import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, test, vi } from 'vitest';

import type { UpdaterLogger } from './update-log';
import type { UpdaterPort } from './wire-app-updater';

import { devFeedPort, wireUpdatesFor } from './updates-wiring';

class FakePort extends EventEmitter {
  autoInstallOnAppQuit = false;

  logger: UpdaterLogger | null = null;

  checks = 0;

  async checkForUpdates(): Promise<unknown> {
    this.checks += 1;

    return Promise.resolve(null);
  }

  quitAndInstall(): void {
    return undefined;
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

function wiredOn(inputs: {
  platform: NodeJS.Platform;
  env: NodeJS.ProcessEnv;
  isPackaged: boolean;
  inApplicationsFolder: boolean;
}) {
  const port = new FakePort();
  const opened = { count: 0 };
  const wiring = wireUpdatesFor({
    ...inputs,
    openPort: (): UpdaterPort => {
      opened.count += 1;

      return port;
    },
    push: () => undefined,
  });

  return { port, opened, wiring };
}

describe('a channel another tool owns', () => {
  test('opens no updater, answers quiet, refuses the restart, and says so once', () => {
    const lines: string[] = [];

    vi.spyOn(console, 'info').mockImplementation((line: unknown) => {
      lines.push(String(line));
    });

    const { opened, wiring } = wiredOn({
      platform: 'linux',
      env: {},
      isPackaged: true,
      inApplicationsFolder: true,
    });

    expect(opened.count).toBe(0);
    expect(wiring.state()).toEqual({ standing: 'quiet' });
    expect(wiring.restart()).toBe(false);
    expect(lines).toEqual([
      "updater: update channel 'package-tool': the app runs no updater of its own",
    ]);

    wiring.dispose();
  });
});

describe('a marker-armed run', () => {
  test('logs failures against the development feed, not the release feed', () => {
    const lines: string[] = [];

    vi.spyOn(console, 'warn').mockImplementation((line: unknown) => {
      lines.push(String(line));
    });

    const { port, wiring } = wiredOn({
      platform: 'darwin',
      env: { RECOMPOSE_DEV_UPDATE_FEED: '1' },
      isPackaged: false,
      inApplicationsFolder: false,
    });

    port.emit('error', new Error('the feed refused'));

    expect(lines).toEqual(['update check failed: the feed refused (feed: dev-app-update.yml)']);

    wiring.dispose();
  });
});

describe('a channel the app owns', () => {
  test('opens the updater once and checks at launch', () => {
    const { opened, port, wiring } = wiredOn({
      platform: 'linux',
      env: { APPIMAGE: '/opt/Recompose.AppImage' },
      isPackaged: true,
      inApplicationsFolder: true,
    });

    expect(opened.count).toBe(1);
    expect(port.checks).toBe(1);

    wiring.dispose();
  });
});

describe('the development feed marker', () => {
  test('points the port at the development feed config exactly when set', () => {
    expect(devFeedPort({ forceDevUpdateConfig: true }, {})).toEqual({
      forceDevUpdateConfig: false,
    });
    expect(
      devFeedPort({ forceDevUpdateConfig: false }, { RECOMPOSE_DEV_UPDATE_FEED: '1' }),
    ).toEqual({ forceDevUpdateConfig: true });
  });

  test('arms an unpackaged run for the local feed', () => {
    const { opened, port, wiring } = wiredOn({
      platform: 'darwin',
      env: { RECOMPOSE_DEV_UPDATE_FEED: '1' },
      isPackaged: false,
      inApplicationsFolder: false,
    });

    expect(opened.count).toBe(1);
    expect(port.checks).toBe(1);

    wiring.dispose();
  });

  test('a bare marker keeps the hourly interval', () => {
    vi.useFakeTimers();

    const { port, wiring } = wiredOn({
      platform: 'darwin',
      env: { RECOMPOSE_DEV_UPDATE_FEED: '1' },
      isPackaged: false,
      inApplicationsFolder: false,
    });

    vi.advanceTimersByTime(1_500);

    expect(port.checks).toBe(1);

    wiring.dispose();
    vi.useRealTimers();
  });

  test('a marker carrying milliseconds shortens the interval to them', () => {
    vi.useFakeTimers();

    const { port, wiring } = wiredOn({
      platform: 'darwin',
      env: { RECOMPOSE_DEV_UPDATE_FEED: '500' },
      isPackaged: false,
      inApplicationsFolder: false,
    });

    vi.advanceTimersByTime(1_500);

    expect(port.checks).toBe(4);

    wiring.dispose();
    vi.useRealTimers();
  });
});
