import { expect, fn, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';

import { onAStepSurface } from '../../testing/on-a-surface';
import { WaitingStep } from './waiting-step';

const meta = preview.meta({
  component: WaitingStep,
  args: {
    address: 'http://127.0.0.1:8389',
    harnesses: ['Claude Code', 'Cursor'],
    onShowCommands: fn(),
    onSkip: fn(),
  },
  decorators: [onAStepSurface],
});

/** The wait names the harnesses that can reach the gateway, and the address they reach. */
export const Waiting = meta.story({
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText(/Send any prompt from Claude Code or Cursor/u),
    ).toBeVisible();
    await expect(await canvas.findByText('http://127.0.0.1:8389')).toBeVisible();
  },
});

/** One act only, and it is the way back to the commands. */
export const OneActOnly = meta.story({
  play: async ({ args, canvas }) => {
    await expect(canvas.queryByRole('button', { name: 'Back' })).toBeNull();

    await userEvent.click(await canvas.findByRole('button', { name: 'Show the commands again' }));

    await expect(args.onShowCommands).toHaveBeenCalledOnce();
  },
});

/** The one thing that reliably goes wrong is said before it does. */
export const TheRecoveryLine = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/same terminal session/u)).toBeVisible();
  },
});

/** A person who picked nothing is still told where to send from. */
export const NoHarnessNamed = meta.story({
  args: { harnesses: [] },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/Send any prompt from your harness/u)).toBeVisible();
  },
});
