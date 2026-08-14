import { describe, expect, test } from 'vitest';

import { DEFAULT_COOLDOWN_MS, coolUntilTheProviderNames } from './cooldown-signal';

const NOW = Date.parse('2026-08-14T12:00:00.000Z');

describe('the retry time a provider names in its own headers', () => {
  test('a delay in seconds counts forward from the moment the refusal arrived', () => {
    const headers = new Headers({ 'retry-after': '120' });

    expect(coolUntilTheProviderNames(headers, NOW)).toEqual({
      coolUntilMs: NOW + 120_000,
      promised: true,
    });
  });

  test('a delay of zero seconds names the moment the refusal arrived', () => {
    const headers = new Headers({ 'retry-after': '0' });

    expect(coolUntilTheProviderNames(headers, NOW)).toEqual({ coolUntilMs: NOW, promised: true });
  });

  test('a date names the instant it stands for rather than a span', () => {
    const headers = new Headers({ 'retry-after': 'Fri, 14 Aug 2026 12:05:00 GMT' });

    expect(coolUntilTheProviderNames(headers, NOW)).toEqual({
      coolUntilMs: NOW + 300_000,
      promised: true,
    });
  });

  test('a header reading as neither a delay nor a date names no retry time', () => {
    const headers = new Headers({ 'retry-after': 'soon' });

    expect(coolUntilTheProviderNames(headers, NOW)).toBeUndefined();
  });

  test('a negative delay names no retry time', () => {
    const headers = new Headers({ 'retry-after': '-30' });

    expect(coolUntilTheProviderNames(headers, NOW)).toBeUndefined();
  });

  test('a delay carrying its own unit beside the digits names no retry time', () => {
    const headers = new Headers({ 'retry-after': '30s' });

    expect(coolUntilTheProviderNames(headers, NOW)).toBeUndefined();
  });

  test('a refusal carrying no timing header at all names no retry time', () => {
    expect(coolUntilTheProviderNames(new Headers(), NOW)).toBeUndefined();
  });
});

describe('the reset windows a rate limit reports beside its refusal', () => {
  test('a reset timestamp names the instant the window reopens', () => {
    const headers = new Headers({
      'anthropic-ratelimit-requests-reset': '2026-08-14T12:00:30.000Z',
    });

    expect(coolUntilTheProviderNames(headers, NOW)).toEqual({
      coolUntilMs: NOW + 30_000,
      promised: false,
    });
  });

  test('several windows reporting at once name the one that reopens first', () => {
    const headers = new Headers({
      'anthropic-ratelimit-requests-reset': '2026-08-14T12:01:00.000Z',
      'anthropic-ratelimit-input-tokens-reset': '2026-08-14T12:00:20.000Z',
      'anthropic-ratelimit-output-tokens-reset': '2026-08-14T12:02:00.000Z',
    });

    expect(coolUntilTheProviderNames(headers, NOW)).toEqual({
      coolUntilMs: NOW + 20_000,
      promised: false,
    });
  });

  test('an explicit retry header outranks the reset windows beside it', () => {
    const headers = new Headers({
      'retry-after': '5',
      'anthropic-ratelimit-requests-reset': '2026-08-14T12:10:00.000Z',
    });

    expect(coolUntilTheProviderNames(headers, NOW)).toEqual({
      coolUntilMs: NOW + 5_000,
      promised: true,
    });
  });

  test('a reset window reading as no date at all names no retry time', () => {
    const headers = new Headers({ 'anthropic-ratelimit-requests-reset': 'never' });

    expect(coolUntilTheProviderNames(headers, NOW)).toBeUndefined();
  });
});

describe('which header a reset window is read from, and which only looks like one', () => {
  test('a header that merely mentions the limit without reporting a reset is passed over', () => {
    const headers = new Headers({ 'anthropic-ratelimit-requests-remaining': '0' });

    expect(coolUntilTheProviderNames(headers, NOW)).toBeUndefined();
  });

  test('a header whose name only begins like a reset window is passed over', () => {
    const headers = new Headers({
      'anthropic-ratelimit-requests-reset-observed': '2026-08-14T12:00:30.000Z',
    });

    expect(coolUntilTheProviderNames(headers, NOW)).toBeUndefined();
  });

  test('a header whose name only ends like a reset window is passed over', () => {
    const headers = new Headers({
      'x-relayed-anthropic-ratelimit-requests-reset': '2026-08-14T12:00:30.000Z',
    });

    expect(coolUntilTheProviderNames(headers, NOW)).toBeUndefined();
  });
});

describe('only a retry header is the provider promising the failure clears', () => {
  test('a reset window beside a 5xx times the stand-down and promises nothing', () => {
    const headers = new Headers({
      'anthropic-ratelimit-requests-reset': '2026-08-14T12:00:45.000Z',
    });

    expect(coolUntilTheProviderNames(headers, NOW)?.promised).toBe(false);
  });

  test('a retry header names a wait a caller may be told to obey', () => {
    const headers = new Headers({ 'retry-after': '45' });

    expect(coolUntilTheProviderNames(headers, NOW)?.promised).toBe(true);
  });
});

describe('the cooling a walk applies when no provider names a time', () => {
  test('the recorded default spans one window of the common per-minute limits', () => {
    expect(DEFAULT_COOLDOWN_MS).toBe(60_000);
  });
});
