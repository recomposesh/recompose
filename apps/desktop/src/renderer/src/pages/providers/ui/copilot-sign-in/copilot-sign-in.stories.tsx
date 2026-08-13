import { expect, fn, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';
import { inSettingsColumn } from '#.storybook/settings-column';

import { entryNamed } from '../../testing/catalog-entry';
import { CopilotSignIn } from './copilot-sign-in';

const meta = preview.meta({
  component: CopilotSignIn,
  args: { entry: entryNamed('copilot'), onConnected: fn() },
  decorators: [inSettingsColumn],
});

/**
 * The one sign-in recompose runs itself, showing what to type and where.
 *
 * @summary Every other plan hands its sign-in to a tool, so its step names a command to run.
 * Nothing on this machine owns Copilot's, so this step shows the code GitHub issued and the
 * address it is entered at. The reading asks for both, because a code without an address sends
 * nobody anywhere.
 */
export const ShowsTheCodeAndWhereToEnterIt = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('ABCD-1234')).toBeVisible();
    await expect(await canvas.findByText('https://github.com/login/device')).toBeVisible();
  },
});

/**
 * The act asks GitHub rather than claiming the sign-in finished on its own.
 *
 * @summary The step never decides a sign-in landed. It presses, waits on the answer, and steps
 * aside only once the account is stored, so a person who has yet to enter the code sees the step
 * still standing.
 */
export const AsksGitHubOncePressed = meta.story({
  play: async ({ args, canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'I entered the code' }));

    await expect(args.onConnected).toHaveBeenCalled();
  },
});

/** The same step in the dark scheme, where the code lifts off the sheet behind it. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
