import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { NoProviderNote } from './no-provider-note';

const meta = preview.meta({ component: NoProviderNote });

/**
 * The note as a picker with nothing to offer shows it.
 *
 * @summary The link carries the Subscriptions section, because that is the first place a plan
 * already on this machine gets adopted, and a person arriving with nothing connected has one there
 * more often than a key to paste.
 */
export const Standing = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('No provider connected yet')).toBeVisible();
    await expect(await canvas.findByRole('link', { name: 'Open Providers' })).toHaveAttribute(
      'href',
      '/providers?kind=subscription',
    );
  },
});

/** The note in the dark scheme, where its box has to hold against the surface behind it. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
