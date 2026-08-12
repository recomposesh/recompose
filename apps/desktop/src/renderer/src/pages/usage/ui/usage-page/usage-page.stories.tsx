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
    await expect(
      await canvas.findByRole('heading', { level: 2, name: 'No requests yet' }),
    ).toBeVisible();
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
    await expect(
      await canvas.findByText('relay · All providers · Last 7 days · local time'),
    ).toBeVisible();
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
