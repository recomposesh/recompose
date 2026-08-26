import { expect, fn, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';
import { inSettingsColumn } from '#.storybook/settings-column';

import { AppSignInRow } from './app-sign-in-row';

const meta = preview.meta({
  component: AppSignInRow,
  args: { provider: 'openai' as const, planName: 'OpenAI', onConnected: fn() },
  decorators: [
    inSettingsColumn,
    (Story) => (
      <div className="w-full divide-y divide-line-faint field-box text-start">
        <Story />
      </div>
    ),
  ],
});

/**
 * The way in that needs nothing installed, offered as one row among the others.
 *
 * @summary The line beneath is the whole of what tells this row apart from the tool's own, so the
 * reading pins it: a person picking here learns that recompose ends up holding the sign-in.
 */
export const SaysWhoHoldsTheSignIn = meta.story({
  play: async ({ canvas }) => {
    const offered = await canvas.findByRole('button', {
      name: 'Sign in to OpenAI through recompose',
    });

    await expect(offered).toBeEnabled();
    await expect(
      await canvas.findByText('Opens your browser. recompose holds this sign-in.'),
    ).toBeVisible();
  },
});

/**
 * The row picked, which opens the browser and waits for the redirect to land.
 *
 * @summary Nothing else on the step moves while the far end is asked, so the row itself has to
 * read as the wait. The reading asks for the account to have landed, because a row that opened a
 * browser and never closed the sheet is the failure this pins against.
 */
export const WaitsOutTheBrowserOncePicked = meta.story({
  play: async ({ args, canvas }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Sign in to OpenAI through recompose' }),
    );

    await expect(args.onConnected).toHaveBeenCalled();
  },
});

/**
 * The row standing inert while another act on the step runs.
 *
 * @summary Two sign-ins at once would race for the same account row, so a step already waiting on
 * one holds every other way still.
 */
export const InertWhileAnotherActRuns = meta.story({
  args: { disabled: true },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('button', { name: 'Sign in to OpenAI through recompose' }),
    ).toBeDisabled();
  },
});

/** The same row in the dark scheme. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
