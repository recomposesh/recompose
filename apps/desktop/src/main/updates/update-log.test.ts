import { afterEach, describe, expect, test, vi } from 'vitest';

import { RELEASE_FEED, updateLogFor } from './update-log';

afterEach(() => {
  vi.restoreAllMocks();
});

function heardWarnings() {
  const lines: string[] = [];

  vi.spyOn(console, 'warn').mockImplementation((line: unknown) => {
    lines.push(String(line));
  });

  return lines;
}

describe('a failed update operation reaches the log whole', () => {
  test('the line carries the operation, the reason, and the feed', () => {
    const lines = heardWarnings();
    const log = updateLogFor('https://releases.example');

    log.failed('check', 'HTTP 500 from the feed');

    expect(lines).toEqual([
      'update check failed: HTTP 500 from the feed (feed: https://releases.example)',
    ]);
  });

  test('an install failure names its own operation', () => {
    const lines = heardWarnings();
    const log = updateLogFor('https://releases.example');

    log.failed('install', 'volume is read-only');

    expect(lines).toEqual([
      'update install failed: volume is read-only (feed: https://releases.example)',
    ]);
  });
});

describe("the updater's own logger", () => {
  test('an error line carries the feed beside the message', () => {
    const lines = heardWarnings();
    const log = updateLogFor('https://releases.example');

    log.logger.error('checksum mismatch');

    expect(lines).toEqual(['updater error: checksum mismatch (feed: https://releases.example)']);
  });

  test('info and warn forward quietly under the updater prefix', () => {
    const heard: string[] = [];

    vi.spyOn(console, 'info').mockImplementation((line: unknown) => {
      heard.push(String(line));
    });
    vi.spyOn(console, 'warn').mockImplementation((line: unknown) => {
      heard.push(String(line));
    });

    const log = updateLogFor('https://releases.example');

    log.logger.info('checking for update');
    log.logger.warn('differential fell back to full');

    expect(heard).toEqual([
      'updater: checking for update',
      'updater: differential fell back to full',
    ]);
  });
});

describe('the feed constant', () => {
  test('names the GitHub releases the packaging publishes to', () => {
    expect(RELEASE_FEED).toBe('https://github.com/recomposesh/recompose/releases');
  });
});
