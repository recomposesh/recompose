import { expect } from 'storybook/test';

import preview from '#.storybook/preview';
import { withShellSurface } from '#.storybook/shell-surface';

import type { UsageSearch } from '../../lib/usage-search';

import { servedReport } from '../../../../shared/testing';
import { UsagePage } from './usage-page';

const at7d: UsageSearch = { range: '7d', metric: 'requests', stackedBy: 'gateway' };

const meta = preview.meta({
  component: UsagePage,
  decorators: [withShellSurface],
});

/** The screen before any gateway has served a request. */
export const NothingServedYet = meta.story({
  render: () => <UsagePage onSearchChange={() => {}} search={at7d} />,
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('No requests yet')).toBeVisible();
    await expect(await canvas.findByRole('region', { name: 'By target' })).toBeVisible();
  },
});

/** A week of history: tiles, chart, and three panels reading the same buckets. */
export const SevenDaysOfTraffic = meta.story({
  parameters: { bridge: { usageReport: servedReport } },
  render: () => <UsagePage onSearchChange={() => {}} search={at7d} />,
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('region', { name: 'Requests over time' })).toBeVisible();
    await expect(await canvas.findByRole('region', { name: 'By target' })).toBeVisible();
  },
});

/** Spend by day: billed and equivalent as two labelled figures that never merge. */
export const SpendByDay = meta.story({
  parameters: { bridge: { usageReport: servedReport } },
  render: () => (
    <UsagePage
      onSearchChange={() => {}}
      search={{ range: '7d', metric: 'spend', stackedBy: 'gateway' }}
    />
  ),
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('radio', { name: 'Spend' })).toBeChecked();

    const equivalents = await canvas.findAllByText(/≈\$0\.80/);

    await expect(equivalents.length).toBeGreaterThan(0);
  },
});

function servedThrough(answer: () => Promise<never>) {
  return { bridge: { usageReport: servedReport, overrides: { 'usage:report': answer } } };
}

/** History still loading: placeholders hold the shape, never false zeros. */
export const LoadingPlaceholders = meta.story({
  parameters: servedThrough(async () => new Promise<never>(() => {})),
  render: () => <UsagePage onSearchChange={() => {}} search={at7d} />,
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Reading history')).toBeVisible();
  },
});

/** A filter narrowed onto one gateway, which every reading below follows. */
export const NarrowedToOneGateway = meta.story({
  parameters: { bridge: { usageReport: servedReport } },
  render: () => <UsagePage onSearchChange={() => {}} search={{ ...at7d, gateways: ['relay'] }} />,
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('relay · All providers · Last 7 days')).toBeVisible();
  },
});

/** The standing account readings under the explorer: window burn, then credits. */
export const AccountStandingUnderTheExplorer = meta.story({
  parameters: {
    bridge: {
      usageReport: servedReport,
      quotaWindows: [
        {
          accountId: 'work',
          provider: 'anthropic',
          length: '5h',
          burnTokens: 1_200_000,
          record: { burnTokens: 2_000_000, openedAt: Date.UTC(2026, 7, 3, 9, 0) },
        },
      ],
      balances: [
        {
          accountId: 'build',
          reading: { remaining: 37.71, added: 100, spent: 62.29, readAt: Date.now() },
        },
      ],
    },
  },
  render: () => <UsagePage onSearchChange={() => {}} search={at7d} />,
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('region', { name: 'Plan usage limits' })).toBeVisible();
    await expect(await canvas.findByRole('region', { name: 'Credits' })).toBeVisible();
    await expect(await canvas.findByText('$37.71')).toBeVisible();
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
    await expect(await canvas.findByRole('button', { name: 'Try again' })).toBeVisible();
  },
});
