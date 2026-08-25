import { expect, fn, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';

import { SetupStepFrame } from './setup-step-frame';

const meta = preview.meta({
  component: SetupStepFrame,
  args: {
    acts: <button type="button">Continue</button>,
    children: <div className="h-40 rounded-card bg-surface-card" />,
    lede: 'Pick every harness you work with. They share one gateway and use it the same way.',
    onSkip: fn(),
    step: 'harnesses' as const,
  },
  decorators: [
    (Story) => (
      <div className="h-160 w-full bg-surface-content">
        <Story />
      </div>
    ),
  ],
});

/** The shape every step past the welcome shares: the beats, the heading, the lede, the acts. */
export const Basic = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('list', { name: 'Setup progress' })).toBeVisible();
    await expect(
      await canvas.findByRole('img', { name: 'Which harnesses do you use?' }),
    ).toBeVisible();
    await expect(await canvas.findByRole('button', { name: 'Continue' })).toBeVisible();
  },
});

/** The way out sits in the corner, not in the act row, because leaving is not one of the choices. */
export const SkippingLeavesSetup = meta.story({
  play: async ({ args, canvas }) => {
    const skip = await canvas.findByRole('button', { name: 'Skip setup' });

    await expect(skip.getBoundingClientRect().left).toBeGreaterThan(
      (await canvas.findByRole('button', { name: 'Continue' })).getBoundingClientRect().right,
    );

    await userEvent.click(skip);

    await expect(args.onSkip).toHaveBeenCalledOnce();
  },
});
