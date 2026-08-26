import { afterEach, describe, expect, test, vi } from 'vitest';

import { warningLines, wired } from './wire-app-updater.testkit';

afterEach(() => {
  vi.restoreAllMocks();
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

describe('a check nobody asked for', () => {
  test('the launch check reports nothing to any window', () => {
    const { pushed, wiring } = wired();

    expect(pushed).toEqual([]);
    expect(wiring.state()).toEqual({ standing: 'quiet' });
  });

  test('its refusal stays in the log and reaches no window', () => {
    const lines = warningLines();
    const { updater, pushed, wiring } = wired();

    updater.emit('error', new Error('feed refused'));

    expect(pushed).toEqual([]);
    expect(wiring.state()).toEqual({ standing: 'quiet' });
    expect(lines).toEqual(['update check failed: feed refused (feed: https://releases.example)']);
  });

  test('a feed carrying nothing newer reaches no window either', () => {
    const { updater, pushed, wiring } = wired();

    updater.emit('update-not-available', { version: '0.3.0' });

    expect(pushed).toEqual([]);
    expect(wiring.state()).toEqual({ standing: 'quiet' });
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
