import type { UsageReport } from '@recompose/contracts';

import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { UsageSummaryLink } from './usage-summary-link';

const HOUR_MS = 3_600_000;
const NOW_HOUR = Date.now() - (Date.now() % HOUR_MS);

const servedDay: UsageReport = {
  range: '24h',
  bucketWidth: 'hour',
  buckets: [
    {
      start: NOW_HOUR - HOUR_MS,
      tuple: { gateway: 'relay', provider: 'openai', accountId: 'work' },
      measures: {
        requests: 42,
        failed: 0,
        answered: 42,
        durationMsSum: 21_000,
        tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0, total: 900 },
      },
    },
  ],
  dayCosts: [],
  priceMisses: [],
  pricing: { source: 'bundled' },
};

const meta = preview.meta({
  component: UsageSummaryLink,
});

/** A served scope summarizes its day and links into the pre-filtered explorer. */
export const AServedDay = meta.story({
  parameters: { bridge: { usageReport: servedDay } },
  render: () => <UsageSummaryLink scope={{ param: 'gateway', value: 'relay' }} />,
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('link', { name: /42 requests/ })).toBeVisible();
  },
});

/** A zero card reads zero and offers no dead end. */
export const AQuietDay = meta.story({
  render: () => <UsageSummaryLink scope={{ param: 'gateway', value: 'quiet' }} />,
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByText(/No requests in the last 24 hours/)).toBeVisible();
    await expect(canvasElement.querySelector('a')).toBeNull();
  },
});
