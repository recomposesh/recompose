import type { LogRow, UsageBucket, UsageReport } from '@recompose/contracts';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { openBalancesDesk } from '../usage/balances';
import { createUsageIpcHandlers } from './usage-ipc';

const HOUR = 3_600_000;

const DAY_START = 1_754_524_800_000;

const NOW = DAY_START + 26 * HOUR + 30 * 60_000;

const CLIENT_KEY = `sha256:${'a'.repeat(64)}`;

function aBucket(
  standing: Partial<UsageBucket['tuple']> & { start?: number; tokens?: number },
): UsageBucket {
  const { start = DAY_START + 25 * HOUR, tokens = 1_000_000, ...tuple } = standing;

  return {
    start,
    tuple: {
      gateway: 'relay',
      virtualModel: 'creative',
      provider: 'anthropic',
      providerModel: 'claude-sonnet-4-5',
      accountId: 'work',
      accountKind: 'api-key',
      ...tuple,
    },
    measures: {
      requests: 4,
      failed: 0,
      answered: 4,
      durationMsSum: 4_000,
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

function aQuietReport(buckets: readonly UsageBucket[]): UsageReport {
  return {
    range: '24h',
    bucketWidth: 'hour',
    buckets,
    dayCosts: [],
    priceMisses: [],
    pricing: { source: 'bundled' },
    oldestRetainedStart: DAY_START,
  };
}

function handlersOver(standing: {
  reported?: readonly UsageBucket[];
  held?: readonly UsageBucket[];
  rows?: readonly LogRow[];
  noted?: boolean[];
}) {
  return createUsageIpcHandlers({
    store: {
      report: async (range) => Promise.resolve({ ...aQuietReport(standing.reported ?? []), range }),
      heldBuckets: () => standing.held ?? [],
    },
    standingPrices: () => ({
      prices: new Map([
        ['claude-sonnet-4-5', { inputPerToken: 0.000003, outputPerToken: 0.000015 }],
      ]),
      provenance: { source: 'synced', fetchedAt: NOW - HOUR },
    }),
    retainedRows: () => standing.rows ?? [],
    balances: openBalancesDesk({
      aggregatorAccounts: async () => Promise.resolve([{ accountId: 'router-1' }]),
      creditsOf: async () => Promise.resolve({ totalCredits: 25, totalUsage: 18.4 }),
    }),
    noteUsageTable: (open) => {
      standing.noted?.push(open);
    },
  });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('the report answer', () => {
  test('the buckets ride whole and the covering days price at answer time', async () => {
    const handlers = handlersOver({ reported: [aBucket({})] });

    const answer = await handlers['usage:report']({ range: '24h' });

    if (!answer.ok) {
      throw new Error('the report refused');
    }

    expect(answer.value.buckets).toHaveLength(1);
    expect(answer.value.dayCosts).toEqual([
      {
        dayStart: DAY_START + 24 * HOUR,
        tuple: aBucket({}).tuple,
        billedMicroDollars: 3_000_000,
      },
    ]);
    expect(answer.value.pricing).toEqual({ source: 'synced', fetchedAt: NOW - HOUR });
  });

  test('a model the map cannot name surfaces in the answer rather than pricing as zero', async () => {
    const handlers = handlersOver({ reported: [aBucket({ providerModel: 'claude-mystery' })] });

    const answer = await handlers['usage:report']({ range: '24h' });

    if (!answer.ok) {
      throw new Error('the report refused');
    }

    expect(answer.value.dayCosts).toEqual([]);
    expect(answer.value.priceMisses).toEqual([
      { provider: 'anthropic', providerModel: 'claude-mystery', requests: 4 },
    ]);
  });
});

describe('the quota answer', () => {
  test('the windows fold over the held buckets and the rows still in flight', async () => {
    const live: LogRow = {
      id: 'live-1',
      at: NOW - 60_000,
      gateway: 'relay',
      virtualModel: 'creative',
      origin: 'provider',
      method: 'POST',
      provider: 'anthropic',
      accountId: 'sub-1',
      providerModel: 'claude-sonnet-4-5',
      status: 200,
      durationMs: 912,
      tokens: 500,
      clientKey: CLIENT_KEY,
    };
    const handlers = handlersOver({
      held: [
        aBucket({
          accountId: 'sub-1',
          accountKind: 'subscription',
          start: NOW - (NOW % HOUR),
          tokens: 1_000,
        }),
      ],
      rows: [live],
    });

    const answer = await handlers['usage:quota-windows'](undefined);

    if (!answer.ok) {
      throw new Error('the quota read refused');
    }

    expect(answer.value.find((held) => held.length === '5h')?.burnTokens).toBe(1_500);
  });
});

describe('the balances answer and the table twin note', () => {
  test('a balances read answers the cards with their stamps', async () => {
    const handlers = handlersOver({});

    const answer = await handlers['usage:balances']({ refresh: false });

    if (!answer.ok) {
      throw new Error('the balances read refused');
    }

    expect(answer.value).toEqual([
      { accountId: 'router-1', reading: { totalCredits: 25, totalUsage: 18.4, readAt: NOW } },
    ]);
  });

  test('the table twin standing lands where the menu reads it', async () => {
    const noted: boolean[] = [];
    const handlers = handlersOver({ noted });

    const answer = await handlers['system:usage-table']({ open: true });

    expect(answer).toEqual({ ok: true, value: undefined });
    expect(noted).toEqual([true]);
  });
});
