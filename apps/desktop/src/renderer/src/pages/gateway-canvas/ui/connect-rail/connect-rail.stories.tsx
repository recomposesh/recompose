import { expect, fn, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';

import { connectGroups } from '../../model/connect-catalog';
import { ConnectRail } from './connect-rail';

const meta = preview.meta({
  component: ConnectRail,
  args: {
    groups: connectGroups,
    selected: 'claude-code',
    onSelect: fn(),
    asked: '',
    onAsk: fn(),
  },
});

/** Every client recompose knows how to point, grouped by what kind of tool each one is. */
export const EveryClient = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: /Claude Code/ })).toBeVisible();
    await expect(await canvas.findByRole('heading', { name: 'Terminal agents' })).toBeVisible();
    await expect(await canvas.findByRole('heading', { name: 'Editors' })).toBeVisible();
  },
});

/** The selected row, which is the one the pane beside the rail is reading. */
export const Selected = meta.story({
  play: async ({ canvas }) => {
    const row = await canvas.findByRole('button', { name: /Claude Code/ });

    await expect(row).toHaveAttribute('aria-current', 'true');
  },
});

/** A narrowed list, where a heading with nothing under it leaves rather than standing empty. */
export const Narrowed = meta.story({
  args: { asked: 'codex' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: /Codex CLI/ })).toBeVisible();
    await expect(canvas.queryByRole('heading', { name: 'Editors' })).toBeNull();
  },
});

/** A narrowing nothing answers to, which says so rather than showing an empty column. */
export const NothingMatches = meta.story({
  args: { asked: 'notepad' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/No client here answers to that/)).toBeVisible();
  },
});

/** Picking a row hands its id back, which is what moves the pane beside the rail. */
export const PickingAClient = meta.story({
  play: async ({ args, canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: /opencode/ }));

    await expect(args.onSelect).toHaveBeenCalledWith('opencode');
  },
});

/** The whole rail in the dark scheme, where the selected row carries a tinted fill. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
