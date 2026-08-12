import type { LogRow, UsageBucket } from '@recompose/contracts';

import { describe, expect, test } from 'vitest';

import { quotaWindowsOf } from './quota-windows';

const HOUR = 3_600_000;

const BASE = 1_754_524_800_000;

const CLIENT_KEY = `sha256:${'a'.repeat(64)}`;

type BucketStanding = {
  accountId?: string;
  accountKind?: UsageBucket['tuple']['accountKind'];
  tokens?: number;
};

function anHour(start: number, standing: BucketStanding = {}): UsageBucket {
  const { accountId = 'sub-1', accountKind = 'subscription', tokens = 1_000 } = standing;

  return {
    start,
    tuple: {
      gateway: 'relay',
      virtualModel: 'creative',
      provider: 'anthropic',
      providerModel: 'claude-sonnet-4-5',
      accountId,
      accountKind,
    },
    measures: {
      requests: 1,
      failed: 0,
      answered: 1,
      durationMsSum: 900,
      tokens: {
        input: tokens,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
        reasoning: 0,
        total: tokens,
      },
    },
  };
}

function aLiveRow(at: number, tokens: number): LogRow {
  return {
    id: `live-${String(at)}`,
    at,
    gateway: 'relay',
    virtualModel: 'creative',
    origin: 'provider',
    method: 'POST',
    provider: 'anthropic',
    accountId: 'sub-1',
    providerModel: 'claude-sonnet-4-5',
    status: 200,
    durationMs: 912,
    tokens,
    clientKey: CLIENT_KEY,
  };
}

function fiveHourOf(windows: ReturnType<typeof quotaWindowsOf>, accountId = 'sub-1') {
  return windows.find((held) => held.accountId === accountId && held.length === '5h');
}

function weekOf(windows: ReturnType<typeof quotaWindowsOf>, accountId = 'sub-1') {
  return windows.find((held) => held.accountId === accountId && held.length === 'week');
}

describe('the five hour window', () => {
  test('an account nobody subscribed never earns a window', () => {
    const buckets = [anHour(BASE, { accountKind: 'api-key' })];

    expect(quotaWindowsOf(buckets, [], BASE + HOUR)).toEqual([]);
  });

  test('the window opens at the first activity and burns what the hours hold', () => {
    const buckets = [anHour(BASE, { tokens: 1_200 }), anHour(BASE + HOUR, { tokens: 800 })];

    const window = fiveHourOf(quotaWindowsOf(buckets, [], BASE + 2 * HOUR));

    expect(window).toMatchObject({
      accountId: 'sub-1',
      provider: 'anthropic',
      openedAt: BASE,
      closesAt: BASE + 5 * HOUR,
      burnTokens: 2_000,
    });
  });

  test('activity after a window closes opens the next one, and the record keeps the biggest', () => {
    const buckets = [
      anHour(BASE, { tokens: 5_000 }),
      anHour(BASE + HOUR, { tokens: 4_000 }),
      anHour(BASE + 6 * HOUR, { tokens: 1_000 }),
    ];

    const window = fiveHourOf(quotaWindowsOf(buckets, [], BASE + 7 * HOUR));

    expect(window).toMatchObject({
      openedAt: BASE + 6 * HOUR,
      burnTokens: 1_000,
      record: { burnTokens: 9_000, openedAt: BASE },
    });
  });

  test('a quiet account reads zero burn with no countdown, keeping its record', () => {
    const buckets = [anHour(BASE, { tokens: 5_000 })];

    const window = fiveHourOf(quotaWindowsOf(buckets, [], BASE + 12 * HOUR));

    expect(window?.burnTokens).toBe(0);
    expect(window?.openedAt).toBeUndefined();
    expect(window?.closesAt).toBeUndefined();
    expect(window?.record).toEqual({ burnTokens: 5_000, openedAt: BASE });
  });

  test('a row the ledger has not folded yet still burns into the open window', () => {
    const buckets = [anHour(BASE, { tokens: 1_000 })];
    const live = [aLiveRow(BASE + 90 * 60_000, 500)];

    expect(fiveHourOf(quotaWindowsOf(buckets, live, BASE + 2 * HOUR))?.burnTokens).toBe(1_500);
  });
});

describe('the weekly window and the account split', () => {
  test('the weekly window burns the same fold and never claims a close', () => {
    const buckets = [anHour(BASE, { tokens: 1_200 }), anHour(BASE + 24 * HOUR, { tokens: 800 })];

    const week = weekOf(quotaWindowsOf(buckets, [], BASE + 25 * HOUR));

    expect(week?.burnTokens).toBe(2_000);
    expect(week?.closesAt).toBeUndefined();
  });

  test('two subscription accounts read their own windows apart', () => {
    const buckets = [
      anHour(BASE, { tokens: 1_000 }),
      anHour(BASE, { accountId: 'sub-2', tokens: 3_000 }),
    ];

    const windows = quotaWindowsOf(buckets, [], BASE + HOUR);

    expect(fiveHourOf(windows)?.burnTokens).toBe(1_000);
    expect(fiveHourOf(windows, 'sub-2')?.burnTokens).toBe(3_000);
    expect(windows).toHaveLength(4);
  });
});
