import { expect } from 'storybook/test';

import preview from '#.storybook/preview';
import { withShellSurface } from '#.storybook/shell-surface';

import type { UsageSearch } from '../../lib/usage-search';

import { servedReport } from '../../../../shared/testing';
import { UsagePage } from './usage-page';

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
