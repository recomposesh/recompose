import type { QuotaWindow } from '@recompose/contracts';

import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { QuotaStrip } from './quota-strip';

const NOW = 1_755_000_000_000;
const HOUR_MS = 3_600_000;

const windows: readonly QuotaWindow[] = [
  {
    accountId: 'work',
    provider: 'anthropic',
    length: '5h',
    openedAt: NOW - 2 * HOUR_MS,
    closesAt: NOW + 3 * HOUR_MS,
    burnTokens: 1_200_000,
    record: { burnTokens: 2_000_000, openedAt: 1_754_179_200_000 },
  },
  { accountId: 'work', provider: 'anthropic', length: 'week', burnTokens: 9_400_000 },
];

const meta = preview.meta({
  component: QuotaStrip,
});

/** Burn on a fixed track, the record as a marker, and every figure marked approximate. */
export const TwoGauges = meta.story({
  render: () => <QuotaStrip accountNameOf={() => 'Work seat'} now={NOW} windows={windows} />,
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/~1\.2M tokens/)).toBeVisible();
    await expect(await canvas.findByText(/~3h until reset/)).toBeVisible();
    await expect(
      await canvas.findByText(/Derived from local logs on UTC hour boundaries/),
    ).toBeVisible();
  },
});
