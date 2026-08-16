import { expect } from 'storybook/test';

import preview from '#.storybook/preview';
import { inSettingsColumn } from '#.storybook/settings-column';

import { entryNamed } from '../../testing/catalog-entry';
import { AppSignInStep } from './app-sign-in-step';

const meta = preview.meta({
  component: AppSignInStep,
  args: {
    entry: entryNamed('kimi'),
    asks: 'Enter this code to finish signing in',
    children: <p className="font-mono text-heading text-ink">ABCD-1234</p>,
    refusal: null,
  },
  decorators: [inSettingsColumn],
});

/**
 * The shell every sign-in this app runs itself stands in.
 *
 * @summary The plan heads it, one line says what the step asks, and whatever the plan needs in
 * between stands under both. A reading pins the parts that never change, because those are the
 * ones a second such plan inherits rather than rewrites.
 */
export const Basic = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { name: 'Kimi' })).toBeVisible();
    await expect(await canvas.findByText('Enter this code to finish signing in')).toBeVisible();
    await expect(await canvas.findByText('ABCD-1234')).toBeVisible();
  },
});

/** A refusal reaches the screen as a sentence, under whatever the step was showing. */
export const Refused = meta.story({
  args: { refusal: new Error('The sign-in was denied.') },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('alert')).toHaveTextContent('The sign-in was denied.');
  },
});

/** Nothing went wrong, so nothing claims anything did. */
export const NothingRefused = meta.story({
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('alert')).toBeNull();
  },
});

/** The same shell in the dark scheme. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
