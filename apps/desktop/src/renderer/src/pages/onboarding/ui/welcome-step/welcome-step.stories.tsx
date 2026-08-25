import { expect, fn, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';

import { onAStepSurface } from '../../testing/on-a-surface';
import { WelcomeStep } from './welcome-step';

const meta = preview.meta({
  component: WelcomeStep,
  args: { onExplore: fn(), onSetUp: fn() },
  decorators: [onAStepSurface],
});

/** The first thing a new profile meets: the lockup, the tagline, and two ways on. */
export const Basic = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('img', { name: 'recompose' })).toBeVisible();
    await expect(
      await canvas.findByRole('img', {
        name: 'Every model, in every harness, one gateway to run.',
      }),
    ).toBeVisible();
    await expect(await canvas.findByRole('button', { name: 'Set up my gateway' })).toBeVisible();
    await expect(
      await canvas.findByRole('button', { name: "I'll explore on my own" }),
    ).toBeVisible();
  },
});

/** The step asks nothing, so it offers no skip: the second act is already the way out. */
export const CarriesNoSkip = meta.story({
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('button', { name: 'Skip setup' })).toBeNull();
  },
});

/** The primary act carries the person into the first question setup asks. */
export const SettingUp = meta.story({
  play: async ({ args, canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Set up my gateway' }));

    await expect(args.onSetUp).toHaveBeenCalledOnce();
    await expect(args.onExplore).not.toHaveBeenCalled();
  },
});

/** The second act leaves setup, which is the same standing as dismissing it anywhere else. */
export const Exploring = meta.story({
  play: async ({ args, canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: "I'll explore on my own" }));

    await expect(args.onExplore).toHaveBeenCalledOnce();
    await expect(args.onSetUp).not.toHaveBeenCalled();
  },
});
