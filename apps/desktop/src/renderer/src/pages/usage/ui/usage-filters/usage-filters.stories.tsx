import { expect, screen, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';

import type { UsageSearch } from '../../lib/usage-search';

import { refusedReport, servedReport } from '../../../../shared/testing';
import { UsageFilters } from './usage-filters';

const at7d: UsageSearch = { range: '7d', metric: 'requests', stackedBy: 'gateway' };

const meta = preview.meta({
  component: UsageFilters,
  args: { search: at7d, onSearchChange: () => {} },
  parameters: { bridge: { usageReport: servedReport } },
});

/** Both filters standing on everything the window served. */
export const StandingOnEverything = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: 'Gateways All' })).toBeVisible();
    await expect(await canvas.findByRole('button', { name: 'Providers All' })).toBeVisible();
  },
});

/** One filter narrowed, which the trigger counts and the accent marks. */
export const Narrowed = meta.story({
  args: { search: { ...at7d, gateways: ['relay'] } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: /Gateways 1 of/ })).toBeVisible();
  },
});

/** A window the gateway refused throughout, where the provider filter names the absence. */
export const NothingReachedAnAccount = meta.story({
  parameters: { bridge: { usageReport: refusedReport } },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Providers All' }));

    await expect(await screen.findByRole('checkbox', { name: 'No account reached' })).toBeVisible();
  },
});
