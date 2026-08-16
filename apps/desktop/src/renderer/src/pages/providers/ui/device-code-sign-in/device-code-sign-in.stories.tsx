import { expect, fn, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';
import { inSettingsColumn } from '#.storybook/settings-column';

import { entryNamed } from '../../testing/catalog-entry';
import { DeviceCodeSignIn } from './device-code-sign-in';

const meta = preview.meta({
  component: DeviceCodeSignIn,
  args: { entry: entryNamed('copilot'), provider: 'copilot' as const, onConnected: fn() },
  decorators: [inSettingsColumn],
});

/**
 * A sign-in recompose runs itself, showing what to type and where.
 *
 * @summary A plan whose own tool owns the flow names a command to run instead. Nothing on this
 * machine owns Copilot's, so this step shows the code the provider issued and the address it is
 * entered at. The reading asks for both, because a code without an address sends nobody anywhere.
 */
export const ShowsTheCodeAndWhereToEnterIt = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('ABCD-1234')).toBeVisible();
    await expect(await canvas.findByText('https://github.com/login/device')).toBeVisible();
  },
});

/**
 * The act asks the provider rather than claiming the sign-in finished on its own.
 *
 * @summary The step never decides a sign-in landed. It presses, waits on the answer, and steps
 * aside only once the account is stored, so a person who has yet to enter the code sees the step
 * still standing.
 */
export const AsksTheProviderOncePressed = meta.story({
  play: async ({ args, canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'I entered the code' }));

    await expect(args.onConnected).toHaveBeenCalled();
  },
});

/**
 * The same step under a second plan, which is the whole point of it standing apart from one.
 *
 * @summary Kimi issues a code the same way, so it reaches the same surface under its own name
 * rather than a copy of this one kept in step by hand.
 */
export const UnderASecondPlan = meta.story({
  args: { entry: entryNamed('kimi'), provider: 'kimi' as const },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { name: 'Kimi' })).toBeVisible();
    await expect(await canvas.findByText('ABCD-1234')).toBeVisible();
  },
});

/** The same step in the dark scheme, where the code lifts off the sheet behind it. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
