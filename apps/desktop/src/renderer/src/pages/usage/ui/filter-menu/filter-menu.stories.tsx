import { expect, screen, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';

import type { FilterMember } from './filter-menu';

import { FilterMenu } from './filter-menu';

const gateways: readonly FilterMember[] = [
  { key: 'claude-code', name: 'claude-code', requests: 6_120 },
  { key: 'cursor', name: 'cursor', requests: 3_240 },
  { key: 'api-playground', name: 'api-playground', requests: 2_100 },
  { key: 'raycast', name: 'raycast', requests: 1_020 },
];

const meta = preview.meta({
  component: FilterMenu,
  args: {
    label: 'Gateways',
    members: gateways,
    onSelectedChange: () => {},
    searchLabel: 'Search gateways',
    selected: [],
  },
});

/** The filter at rest, standing on every gateway the window served. */
export const StandingOnEverything = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: 'Gateways All' })).toBeVisible();
  },
});

/** A narrowed filter names its count on the trigger and carries the accent. */
export const Narrowed = meta.story({
  args: { selected: ['claude-code', 'cursor'] },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: 'Gateways 2 of 4' })).toBeVisible();
  },
});

/** A window that served nobody: the menu names the quiet and offers nothing to select. */
export const Quiet = meta.story({
  args: { members: [] },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Gateways All' }));

    await expect(await screen.findByText('No gateways in this window')).toBeVisible();
  },
});

/** The menu a filter opens on: every member reads kept, because the view keeps every one. */
export const OpenedOnEverything = meta.story({
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Gateways All' }));

    await expect(await screen.findByRole('checkbox', { name: 'raycast' })).toBeChecked();
  },
});

/** The open menu: every member with what it served, a search field, and the standing count. */
export const Opened = meta.story({
  args: { selected: ['claude-code', 'cursor'] },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Gateways 2 of 4' }));

    await expect(await screen.findByRole('checkbox', { name: 'raycast' })).toBeVisible();
  },
});
