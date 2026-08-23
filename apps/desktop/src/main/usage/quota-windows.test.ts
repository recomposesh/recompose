import type { LogRow, PlanUsageReadings, PlanUsageWindow, UsageBucket } from '@recompose/contracts';

import { describe, expect, test } from 'vitest';

import { quotaWindowsOf } from './quota-windows';

const HOUR = 3_600_000;

const BASE = 1_754_524_800_000;

const CLIENT_KEY = `sha256:${'a'.repeat(64)}`;

const NOTHING_REPORTED: PlanUsageReadings = {};

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

function aLiveRow(at: number, tokens?: number, accountId = 'sub-1'): LogRow {
  return {
    id: `live-${String(at)}`,
    at,
    gateway: 'relay',
    virtualModel: 'creative',
    origin: 'provider',
    method: 'POST',
    provider: 'anthropic',
    accountId,
    providerModel: 'claude-sonnet-4-5',
    status: 200,
    durationMs: 912,
    tokens,
    clientKey: CLIENT_KEY,
  };
}

function reportedBy(
  windows: readonly PlanUsageWindow[],
  accountId = 'sub-1',
  readAt = BASE + HOUR,
): PlanUsageReadings {
  return { [accountId]: { accountId, provider: 'anthropic', readAt, windows } };
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

    expect(quotaWindowsOf(buckets, [], BASE + HOUR, NOTHING_REPORTED)).toEqual([]);
  });

  test('the window opens at the first activity and burns what the hours hold', () => {
    const buckets = [anHour(BASE, { tokens: 1_200 }), anHour(BASE + HOUR, { tokens: 800 })];

    const window = fiveHourOf(quotaWindowsOf(buckets, [], BASE + 2 * HOUR, NOTHING_REPORTED));

    expect(window).toMatchObject({
      accountId: 'sub-1',
      provider: 'anthropic',
      openedAt: BASE,
      closesAt: BASE + 5 * HOUR,
      burnTokens: 2_000,
    });
  });

  test('a quiet account reads zero burn with no countdown, keeping its record', () => {
    const buckets = [anHour(BASE, { tokens: 5_000 })];

    const window = fiveHourOf(quotaWindowsOf(buckets, [], BASE + 12 * HOUR, NOTHING_REPORTED));

    expect(window?.burnTokens).toBe(0);
    expect(window?.openedAt).toBeUndefined();
    expect(window?.closesAt).toBeUndefined();
    expect(window?.record).toEqual({ burnTokens: 5_000, openedAt: BASE });
  });
});

describe('the record of the busiest window', () => {
  test('activity after a window closes opens the next one, and the record keeps the biggest', () => {
    const buckets = [
      anHour(BASE, { tokens: 5_000 }),
      anHour(BASE + HOUR, { tokens: 4_000 }),
      anHour(BASE + 6 * HOUR, { tokens: 1_000 }),
    ];

    const window = fiveHourOf(quotaWindowsOf(buckets, [], BASE + 7 * HOUR, NOTHING_REPORTED));

    expect(window).toMatchObject({
      openedAt: BASE + 6 * HOUR,
      burnTokens: 1_000,
      record: { burnTokens: 9_000, openedAt: BASE },
    });
  });

  test('an open window busier than every closed one never becomes the record itself', () => {
    const buckets = [
      anHour(BASE, { tokens: 5_000 }),
      anHour(BASE + 6 * HOUR, { tokens: 4_000 }),
      anHour(BASE + 7 * HOUR, { tokens: 2_000 }),
    ];

    const window = fiveHourOf(quotaWindowsOf(buckets, [], BASE + 8 * HOUR, NOTHING_REPORTED));

    expect(window).toMatchObject({
      openedAt: BASE + 6 * HOUR,
      burnTokens: 6_000,
      record: { burnTokens: 5_000, openedAt: BASE },
    });
  });

  test('a history of one still open window carries no record to measure against', () => {
    const buckets = [anHour(BASE, { tokens: 5_000 })];

    expect(
      fiveHourOf(quotaWindowsOf(buckets, [], BASE + HOUR, NOTHING_REPORTED))?.record,
    ).toBeUndefined();
  });

  test('the weekly row of a first week carries no record either', () => {
    const buckets = [anHour(BASE, { tokens: 5_000 })];

    expect(
      weekOf(quotaWindowsOf(buckets, [], BASE + HOUR, NOTHING_REPORTED))?.record,
    ).toBeUndefined();
  });
});

describe('rows the ledger has not folded yet', () => {
  test('a live row still burns into the open window', () => {
    const buckets = [anHour(BASE, { tokens: 1_000 })];
    const live = [aLiveRow(BASE + 90 * 60_000, 500)];

    expect(
      fiveHourOf(quotaWindowsOf(buckets, live, BASE + 2 * HOUR, NOTHING_REPORTED))?.burnTokens,
    ).toBe(1_500);
  });

  test('a live row of another account never burns into this window', () => {
    const buckets = [anHour(BASE, { tokens: 1_000 })];
    const live = [aLiveRow(BASE + 90 * 60_000, 500, 'someone-else')];

    expect(
      fiveHourOf(quotaWindowsOf(buckets, live, BASE + 2 * HOUR, NOTHING_REPORTED))?.burnTokens,
    ).toBe(1_000);
  });

  test('a live row that reported no token count burns nothing extra', () => {
    const buckets = [anHour(BASE, { tokens: 1_000 })];
    const live = [aLiveRow(BASE + 90 * 60_000)];

    expect(
      fiveHourOf(quotaWindowsOf(buckets, live, BASE + 2 * HOUR, NOTHING_REPORTED))?.burnTokens,
    ).toBe(1_000);
  });
});

describe('the weekly window and the account split', () => {
  test('the weekly window burns the same fold and never claims a close', () => {
    const buckets = [anHour(BASE, { tokens: 1_200 }), anHour(BASE + 24 * HOUR, { tokens: 800 })];

    const week = weekOf(quotaWindowsOf(buckets, [], BASE + 25 * HOUR, NOTHING_REPORTED));

    expect(week?.burnTokens).toBe(2_000);
    expect(week?.closesAt).toBeUndefined();
  });

  test('two subscription accounts read their own windows apart', () => {
    const buckets = [
      anHour(BASE, { tokens: 1_000 }),
      anHour(BASE, { accountId: 'sub-2', tokens: 3_000 }),
    ];

    const windows = quotaWindowsOf(buckets, [], BASE + HOUR, NOTHING_REPORTED);

    expect(fiveHourOf(windows)?.burnTokens).toBe(1_000);
    expect(fiveHourOf(windows, 'sub-2')?.burnTokens).toBe(3_000);
    expect(windows).toHaveLength(4);
  });
});

describe('what the vendor itself answered about the plan', () => {
  const buckets = [anHour(BASE, { tokens: 5_000 })];

  test('a reported share rides the row of the length the vendor named', () => {
    const reported = reportedBy([{ length: '5h', spentShare: 0.42 }]);

    expect(fiveHourOf(quotaWindowsOf(buckets, [], BASE + HOUR, reported))?.reported).toEqual({
      spentShare: 0.42,
      readAt: BASE + HOUR,
    });
  });

  test('a reset instant the vendor named rides across beside the share', () => {
    const reported = reportedBy([{ length: '5h', spentShare: 0.42, resetsAt: BASE + 5 * HOUR }]);

    expect(fiveHourOf(quotaWindowsOf(buckets, [], BASE + HOUR, reported))?.reported).toEqual({
      spentShare: 0.42,
      readAt: BASE + HOUR,
      resetsAt: BASE + 5 * HOUR,
    });
  });

  test('a length the vendor never named leaves that row reporting nothing', () => {
    const reported = reportedBy([{ length: '5h', spentShare: 0.42 }]);

    expect(weekOf(quotaWindowsOf(buckets, [], BASE + HOUR, reported))?.reported).toBeUndefined();
  });

  test('an account no vendor answered for carries no reported share', () => {
    const reported = reportedBy([{ length: '5h', spentShare: 0.42 }], 'sub-2');

    expect(
      fiveHourOf(quotaWindowsOf(buckets, [], BASE + HOUR, reported))?.reported,
    ).toBeUndefined();
  });

  test('a vendor share leaves the burn, the countdown and the record exactly as they were', () => {
    const folded = [anHour(BASE, { tokens: 5_000 }), anHour(BASE + 6 * HOUR, { tokens: 1_000 })];
    const reported = reportedBy([{ length: '5h', spentShare: 0.42 }]);
    const now = BASE + 7 * HOUR;

    expect(fiveHourOf(quotaWindowsOf(folded, [], now, reported))).toEqual({
      ...fiveHourOf(quotaWindowsOf(folded, [], now, NOTHING_REPORTED)),
      reported: { spentShare: 0.42, readAt: BASE + HOUR },
    });
  });
});
