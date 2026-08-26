import { afterEach, describe, expect, test, vi } from 'vitest';

import { everyPendingTurn, warningLines, wired } from './wire-app-updater.testkit';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('a check the person asked for', () => {
  test('says it is asking before the feed has answered', () => {
    const { pushed, wiring } = wired();

    wiring.checkNow();

    expect(pushed).toEqual([{ standing: 'quiet', check: { standing: 'asking' } }]);
  });

  test('a feed carrying nothing newer reports the copy current', () => {
    const { updater, wiring } = wired();

    wiring.checkNow();
    updater.emit('update-not-available', { version: '0.3.0' });

    expect(wiring.state()).toEqual({ standing: 'quiet', check: { standing: 'current' } });
  });

  test('a feed carrying a newer version names it and starts the download', () => {
    const { updater, wiring } = wired();

    wiring.checkNow();
    updater.emit('update-available', { version: '0.4.0' });

    expect(wiring.state()).toEqual({
      standing: 'downloading',
      version: '0.4.0',
      check: { standing: 'found', version: '0.4.0' },
    });
  });

  test('the report clears once the world moves on with nobody asking', () => {
    const { updater, wiring } = wired();

    wiring.checkNow();
    updater.emit('update-not-available', { version: '0.3.0' });
    updater.emit('update-available', { version: '0.4.0' });

    expect(wiring.state()).toEqual({ standing: 'downloading', version: '0.4.0' });
  });
});

describe('a refusal while the person waits', () => {
  test('a refused check names the reason to the person and still reaches the log', () => {
    const lines = warningLines();
    const { updater, wiring } = wired();

    wiring.checkNow();
    updater.emit('error', new Error('feed refused'));

    expect(wiring.state()).toEqual({
      standing: 'quiet',
      check: { standing: 'failed', reason: 'feed refused' },
    });
    expect(lines).toEqual(['update check failed: feed refused (feed: https://releases.example)']);
  });

  test('a check the boundary refuses answers the person too', async () => {
    warningLines();

    const { updater, wiring } = wired();

    updater.answerCheck = async () => Promise.reject(new Error('offline'));
    wiring.checkNow();

    await vi.waitFor(() => {
      expect(wiring.state()).toEqual({
        standing: 'quiet',
        check: { standing: 'failed', reason: 'offline' },
      });
    });
  });

  test('a refusal the updater both emits and rejects stands as one report', async () => {
    warningLines();

    const { updater, wiring } = wired();
    const refusal = new Error('feed refused');

    updater.answerCheck = async () => {
      updater.emit('error', refusal);

      return Promise.reject(refusal);
    };

    wiring.checkNow();

    await everyPendingTurn();

    expect(wiring.state()).toEqual({
      standing: 'quiet',
      check: { standing: 'failed', reason: 'feed refused' },
    });
  });
});

describe('an ask that already stands', () => {
  test('a second ask while one stands runs no second check', () => {
    const { updater, wiring } = wired();

    wiring.checkNow();
    wiring.checkNow();

    expect(updater.checks).toBe(2);
  });

  test('a signal answering no check leaves the ask standing', () => {
    const { updater, wiring } = wired();

    wiring.checkNow();
    updater.emit('update-cancelled', { version: '0.4.0' });

    expect(wiring.state()).toEqual({ standing: 'quiet', check: { standing: 'asking' } });
  });

  test('asking while a version already waits keeps the waiting version in view', () => {
    const { updater, wiring } = wired();

    updater.emit('update-available', { version: '0.4.0' });
    updater.emit('update-downloaded', { version: '0.4.0' });
    wiring.checkNow();

    expect(wiring.state()).toEqual({
      standing: 'ready',
      version: '0.4.0',
      check: { standing: 'asking' },
    });
  });
});
