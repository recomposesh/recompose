import { expect, fn, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';
import { inSettingsColumn } from '#.storybook/settings-column';

import { SignInPress } from './sign-in-press';

const meta = preview.meta({
  component: SignInPress,
  args: { label: 'I entered the code', waitingOn: 'GitHub', pending: false, onPress: fn() },
  decorators: [inSettingsColumn],
});

/** The press a person makes once they have done their part at the far end. */
export const Ready = meta.story({
  play: async ({ args, canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'I entered the code' }));

    await expect(args.onPress).toHaveBeenCalled();
  },
});

/**
 * The same press while the far end has yet to answer.
 *
 * @summary Nothing else on the step moves until the account is stored, so this is the only thing
 * telling a person the press landed. It names the plan, because a person holding two open steps
 * needs to read which one is waiting.
 */
export const Waiting = meta.story({
  args: { pending: true },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: 'Waiting for GitHub' })).toBeVisible();
  },
});

/** The same press in the dark scheme. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
