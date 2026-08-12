import type { UsageReport } from '@recompose/contracts';

import { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  balancesQueryOptions,
  quotaWindowsQueryOptions,
  refreshedBalances,
  usageReportQueryOptions,
  warmedUsageReport,
} from './usage';

const emptyReport: UsageReport = {
  range: '7d',
  bucketWidth: 'hour',
  buckets: [],
  dayCosts: [],
  priceMisses: [],
  pricing: { source: 'bundled' },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('a refresh asks upstream and lands the fresh reading in the cache', () => {
  it('writes the refreshed balances where the card reads', async () => {
    const fresh = [{ accountId: 'build' }];

    vi.stubGlobal('window', {
      recompose: {
        'usage:balances': async ({ refresh }: { refresh: boolean }) =>
          Promise.resolve({ ok: true, value: refresh ? fresh : [] }),
      },
    });

    const queryClient = new QueryClient();

    await refreshedBalances(queryClient);

    expect(queryClient.getQueryData(balancesQueryOptions.queryKey)).toEqual(fresh);
  });
});

describe('the loader warms the report the view will read', () => {
  it('puts the parsed range under its own key before the page mounts', async () => {
    vi.stubGlobal('window', {
      recompose: { 'usage:report': async () => Promise.resolve({ ok: true, value: emptyReport }) },
    });

    const queryClient = new QueryClient();

    await warmedUsageReport(queryClient, '7d');

    expect(queryClient.getQueryData(usageReportQueryOptions('7d').queryKey)).toEqual(emptyReport);
  });

  it('warms nothing for the live-plane range, which never reads the ledger', async () => {
    const queryClient = new QueryClient();

    await warmedUsageReport(queryClient, '1h');

    expect(queryClient.getQueryCache().getAll()).toEqual([]);
  });
});

describe('the report query keeps each range under its own key', () => {
  it('never lets two ranges share a cache entry', () => {
    const keys = (['24h', '7d', '30d'] as const).map(
      (range) => usageReportQueryOptions(range).queryKey,
    );

    expect(new Set(keys.map((key) => JSON.stringify(key))).size).toBe(3);
  });
});

describe('freshness follows the bucket width', () => {
  it('polls hour-wide ranges every minute', () => {
    expect(usageReportQueryOptions('24h').refetchInterval).toBe(60_000);
    expect(usageReportQueryOptions('7d').refetchInterval).toBe(60_000);
    expect(usageReportQueryOptions('24h').staleTime).toBe(60_000);
  });

  it('polls the day-wide range every five minutes', () => {
    expect(usageReportQueryOptions('30d').refetchInterval).toBe(300_000);
    expect(usageReportQueryOptions('30d').staleTime).toBe(300_000);
  });

  it('polls the quota windows every minute, since the open hour moves them', () => {
    expect(quotaWindowsQueryOptions.refetchInterval).toBe(60_000);
  });

  it('keeps a balance reading for the minute the desk itself would', () => {
    expect(balancesQueryOptions.staleTime).toBe(60_000);
  });
});
