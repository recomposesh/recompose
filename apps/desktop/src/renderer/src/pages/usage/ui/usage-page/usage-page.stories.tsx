import type { UsageBucket, UsageReport } from '@recompose/contracts';

import { expect } from 'storybook/test';

import preview from '#.storybook/preview';
import { withShellSurface } from '#.storybook/shell-surface';

import type { UsageSearch } from '../../lib/usage-search';

import { UsagePage } from './usage-page';

const HOUR_MS = 3_600_000;
const NOW_HOUR = Date.now() - (Date.now() % HOUR_MS);
const DAY_START = NOW_HOUR - (NOW_HOUR % 86_400_000);

function servedBucket(start: number, gateway: string, requests: number): UsageBucket {
  return {
    start,
    tuple: { gateway, virtualModel: 'creative', provider: 'openai', accountId: 'work' },
    measures: {
      requests,
      failed: 1,
      answered: requests,
      durationMsSum: requests * 640,
      tokens: {
        input: requests * 420,
        output: requests * 160,
        cacheRead: requests * 210,
        cacheWrite: 0,
        reasoning: 0,
        total: requests * 790,
      },
    },
  };
}

const servedReport: UsageReport = {
  range: '7d',
  bucketWidth: 'hour',
  buckets: Array.from({ length: 36 }, (_, hour) =>
    servedBucket(
      NOW_HOUR - (36 - hour) * HOUR_MS,
      hour % 5 === 0 ? 'backup' : 'relay',
      3 + (hour % 7),
    ),
  ),
  dayCosts: [
    {
      dayStart: DAY_START,
      tuple: { gateway: 'relay', accountKind: 'api-key' },
      billedMicroDollars: 1_920_000,
    },
    {
      dayStart: DAY_START,
      tuple: { gateway: 'relay', accountKind: 'subscription' },
      equivalentMicroDollars: 804_000,
    },
  ],
  priceMisses: [],
  pricing: { source: 'bundled' },
};

const at7d: UsageSearch = { range: '7d', metric: 'requests' };

const meta = preview.meta({
  component: UsagePage,
  decorators: [withShellSurface],
});

/** The screen before any gateway has served a request. */
export const NothingServedYet = meta.story({
  render: () => <UsagePage onSearchChange={() => {}} search={at7d} />,
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('heading', { level: 2, name: 'No requests yet' }),
    ).toBeVisible();
  },
});

/** A week of history: tiles, chart, and breakdown reading the same buckets. */
export const SevenDaysOfTraffic = meta.story({
  parameters: { bridge: { usageReport: servedReport } },
  render: () => <UsagePage onSearchChange={() => {}} search={at7d} />,
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('radio', { name: /Requests/ })).toBeVisible();
    await expect(await canvas.findByRole('table', { name: 'Breakdown' })).toBeInTheDocument();
  },
});

/** Spend by day: billed and equivalent as two labelled figures that never merge. */
export const SpendByDay = meta.story({
  parameters: { bridge: { usageReport: servedReport } },
  render: () => <UsagePage onSearchChange={() => {}} search={{ range: '7d', metric: 'spend' }} />,
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('radio', { name: /Spend/ })).toBeChecked();

    const equivalents = await canvas.findAllByText(/≈\$0\.80/);

    await expect(equivalents.length).toBeGreaterThan(0);
  },
});

/** History still loading: placeholders hold the shape, never false zeros. */
export const LoadingPlaceholders = meta.story({
  parameters: {
    bridge: {
      usageReport: servedReport,
      overrides: { 'usage:report': async () => new Promise<never>(() => {}) },
    },
  },
  render: () => <UsagePage onSearchChange={() => {}} search={at7d} />,
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('radio', { name: /Requests.*—/ })).toBeVisible();
  },
});

/** A scope with nothing served names its own way out. */
export const ScopedEmpty = meta.story({
  parameters: { bridge: { usageReport: servedReport } },
  render: () => <UsagePage onSearchChange={() => {}} search={{ ...at7d, gateway: 'quiet' }} />,
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText('Nothing served through this gateway in the last 7 days'),
    ).toBeVisible();
    await expect(await canvas.findByRole('button', { name: 'Clear scope' })).toBeVisible();
  },
});

/** A refused history read names itself and offers Retry. */
export const ARefusedRead = meta.story({
  parameters: {
    bridge: {
      usageReport: servedReport,
      overrides: {
        'usage:report': async () =>
          Promise.resolve({
            ok: false as const,
            error: {
              code: 'storage-failed' as const,
              message: 'The stored usage history cannot be read.',
            },
          }),
      },
    },
  },
  render: () => <UsagePage onSearchChange={() => {}} search={at7d} />,
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('The stored usage history cannot be read.')).toBeVisible();
    await expect(await canvas.findByRole('button', { name: 'Retry' })).toBeVisible();
  },
});
