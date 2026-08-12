import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { UsageHeader } from './usage-header';

const NOW = 1_754_956_800_000;

const meta = preview.meta({
  component: UsageHeader,
  args: {
    scope: 'All gateways · All providers · Last 24 hours · local time',
    updatedAt: NOW - 12_000,
    now: NOW,
    onRefresh: () => {},
  },
});

/** The title, what the window stands for, and how fresh the readings under it are. */
export const FreshReadings = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Updated 12s ago')).toBeVisible();
    await expect(await canvas.findByRole('button', { name: 'Refresh' })).toBeVisible();
  },
});

/** A narrowed window says what it stands on rather than claiming everything. */
export const Narrowed = meta.story({
  args: { scope: '2 gateways · Work key · Aug 5 12:00 – Aug 12 12:00 · local time' },
});

/** History still arriving: the stamp says so rather than passing for live. */
export const StillReading = meta.story({
  args: { updatedAt: undefined },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Reading history')).toBeVisible();
  },
});

/** Past a minute the stamp counts in minutes, floored, so it never reads ahead of itself. */
export const MinutesOld = meta.story({
  args: { updatedAt: NOW - 119_000 },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Updated 1m ago')).toBeVisible();
  },
});

/** Past an hour it counts in hours, which is where a paused poll shows plainly. */
export const HoursOld = meta.story({
  args: { updatedAt: NOW - 7_500_000 },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Updated 2h ago')).toBeVisible();
  },
});
