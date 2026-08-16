import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { NoProviderRows } from './no-provider-rows';

const meta = preview.meta({
  component: NoProviderRows,
  decorators: [
    (Story) => (
      <div className="mx-auto my-4 w-64 menu-surface px-1.5">
        <Story />
      </div>
    ),
  ],
});

/**
 * The absence as a picker on the canvas wears it, in the menu's own rows.
 *
 * @summary The way out is a row rather than a button, so a pointer already walking the rows meets
 * it where the next choice would have been.
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

/** The rows in the dark scheme, where the accent glyph has to hold against the menu surface. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
