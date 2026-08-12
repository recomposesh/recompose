import type { AccountBalance } from '@recompose/contracts';

import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { BalanceCard } from './balance-card';

const NOW = 1_755_000_000_000;

const balances: readonly AccountBalance[] = [
  {
    accountId: 'build',
    reading: { totalCredits: 25, totalUsage: 12.66, readAt: NOW - 120_000 },
  },
];

const failedRefresh: readonly AccountBalance[] = [
  {
    accountId: 'build',
    reading: { totalCredits: 25, totalUsage: 12.66, readAt: NOW - 2_400_000 },
    failure: 'OpenRouter could not be reached.',
  },
];

const meta = preview.meta({
  component: BalanceCard,
});

/** A balance is a reading at a moment, stamped with when it was taken. */
export const AStampedReading = meta.story({
  render: () => (
    <BalanceCard accountNameOf={() => 'build'} balances={balances} now={NOW} onRefresh={() => {}} />
  ),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('$12.34')).toBeVisible();
    await expect(await canvas.findByText(/read ~2m ago/)).toBeVisible();
  },
});

/** A failed refresh keeps the last reading standing beside the failure sentence. */
export const AFailedRefresh = meta.story({
  render: () => (
    <BalanceCard
      accountNameOf={() => 'build'}
      balances={failedRefresh}
      now={NOW}
      onRefresh={() => {}}
    />
  ),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('$12.34')).toBeVisible();
    await expect(await canvas.findByText('OpenRouter could not be reached.')).toBeVisible();
  },
});
