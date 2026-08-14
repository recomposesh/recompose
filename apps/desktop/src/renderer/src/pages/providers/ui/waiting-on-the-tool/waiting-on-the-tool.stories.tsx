import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { WaitingOnTheTool } from './waiting-on-the-tool';

const NOTHING_OPENED = 'no terminal emulator on this machine could run claude /login';

const meta = preview.meta({
  component: WaitingOnTheTool,
  args: {
    toolName: 'Claude Code',
    command: 'CLAUDE_CONFIG_DIR="/Users/dev/.recompose/subscriptions/anthropic/pending" claude',
  },
  decorators: [
    (Story) => (
      <div className="w-80 p-4">
        <Story />
      </div>
    ),
  ],
});

/**
 * The wait, naming whose tool is running and keeping its command readable.
 */
export const Waiting = meta.story({
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Waiting for Claude Code to finish signing in.')).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: 'Copy the Claude Code sign-in command' }),
    ).toBeVisible();
  },
});

/**
 * The same wait, saying that no terminal opened, so the command below is the person's to run.
 */
export const NoTerminalOpened = meta.story({
  args: { note: NOTHING_OPENED },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(NOTHING_OPENED)).toBeVisible();
    await expect(canvas.getByText('Waiting for Claude Code to finish signing in.')).toBeVisible();
  },
});
