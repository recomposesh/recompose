import { expect, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';

import { CommandLine } from './command-line';

const meta = preview.meta({
  component: CommandLine,
  args: {
    command:
      'export CLAUDE_CONFIG_DIR="/Users/ada/Library/recompose/subscriptions/anthropic/active"',
    label: 'Copy the Claude Code setup line',
  },
});

/**
 * A line handed over whole, because a path elided mid-string pastes wrong.
 *
 * @summary The reading pins that the command reaches the screen verbatim rather than truncated,
 * which is the whole reason the box wraps instead of clipping.
 */
export const Basic = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/subscriptions\/anthropic\/active/)).toBeVisible();
  },
});

/** The copy button names the line it takes, so a screen reader hears which one it copied. */
export const CopyingSaysWhatItTook = meta.story({
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Copy the Claude Code setup line' }),
    );

    await expect(await canvas.findByRole('status')).toBeVisible();
  },
});

/** The same line in the dark scheme, where the box lifts off the surface behind it. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
