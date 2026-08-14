import { expect, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';

import type { UsageSearch } from '../../lib/usage-search';

import { RangeControl } from './range-control';

const NOW = new Date(2026, 7, 12, 12, 0, 0).getTime();
const DAY = 86_400_000;

const at24h: UsageSearch = { range: '24h', metric: 'requests', stackedBy: 'gateway' };

const meta = preview.meta({
  component: RangeControl,
  args: { search: at24h, onSearchChange: () => {}, retentionDays: 30, now: NOW },
});

/** The four presets and the custom window, with the standing one checked. */
export const Presets = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('radio', { name: '24h' })).toBeChecked();
  },
});

/** A range wider than retention stays reachable but unmovable, with the window named. */
export const PastRetention = meta.story({
  args: { retentionDays: 7 },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('radio', { name: '30d' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  },
});

/** A standing custom window reads on the trigger rather than on any preset. */
export const CustomWindow = meta.story({
  args: { search: { ...at24h, range: 'custom' as const, from: NOW - 7 * DAY, to: NOW } },
});

/** The window drawn on two months, with presets beside the calendar. */
export const Drawing = meta.story({
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Custom' }));
  },
});

/** The preset the standing window came from, reading as picked when the popover opens again. */
export const PickedPreset = meta.story({
  args: { search: { ...at24h, range: 'this-month' as const } },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Custom' }));
  },
});
