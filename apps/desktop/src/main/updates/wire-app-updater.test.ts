import { afterEach, describe, expect, test, vi } from 'vitest';

import { updateLogFor } from './update-log';
import { wireAppUpdater } from './wire-app-updater';
import { FakeUpdater, wired } from './wire-app-updater.testkit';

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

  test('holds while a check the person asked for stands, and resumes once it answers', () => {
    vi.useFakeTimers();

    const { updater, wiring } = wired(1_000);

    wiring.checkNow();
    vi.advanceTimersByTime(3_000);

    expect(updater.checks).toBe(2);

    updater.emit('update-not-available', { version: '0.3.0' });
    vi.advanceTimersByTime(1_000);

    expect(updater.checks).toBe(3);
  });

  test('disposal clears it', () => {
    vi.useFakeTimers();

    const { updater, wiring } = wired(1_000);

    wiring.dispose();
    vi.advanceTimersByTime(5_000);

    expect(updater.checks).toBe(1);
  });
});
