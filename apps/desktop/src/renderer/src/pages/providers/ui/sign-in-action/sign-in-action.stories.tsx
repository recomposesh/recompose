import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { SignInAction } from './sign-in-action';

const meta = preview.meta({
  component: SignInAction,
  args: { name: 'Anthropic', disabled: false, onSignIn: () => undefined },
  decorators: [
    (Story) => (
      <div className="flex w-sheet flex-col gap-2 p-4">
        <Story />
      </div>
    ),
  ],
});

/**
 * The act that hands the sign-in to the provider's own tool.
 *
 * @summary The reading asks for the button and the provider it names, because the act belongs to
 * one provider and a person mid-catalog has to see which one before pressing anything.
 */
export const Ready = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: 'Sign in to Anthropic' })).toBeVisible();
  },
});

/**
 * The act with nothing on the machine to carry it out, which stays on screen and cannot move.
 */
export const HeldBack = meta.story({
  args: { disabled: true },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('button', { name: 'Sign in to Anthropic' }),
    ).toBeDisabled();
  },
});

/** The same act in the dark scheme, where the filled control has to keep its standing. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
