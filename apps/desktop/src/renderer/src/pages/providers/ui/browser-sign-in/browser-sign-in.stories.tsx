import { expect, fn, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';
import { inSettingsColumn } from '#.storybook/settings-column';

import { entryNamed } from '../../testing/catalog-entry';
import { BrowserSignIn } from './browser-sign-in';

const meta = preview.meta({
  component: BrowserSignIn,
  args: {
    entry: entryNamed('antigravity'),
    provider: 'antigravity' as const,
    onConnected: fn(),
  },
  decorators: [inSettingsColumn],
});

/**
 * A sign-in that happens in the browser, offered as one press rather than a code.
 *
 * @summary The provider redirects rather than issuing something to type, so there is nothing to
 * show in between. The reading pins that the step waits to be pressed instead of opening a window
 * the moment it mounts.
 */
export const OffersToOpenTheSignInPage = meta.story({
  play: async ({ args, canvas }) => {
    await expect(args.onConnected).not.toHaveBeenCalled();
    await expect(
      await canvas.findByRole('button', { name: 'Open the sign-in page' }),
    ).toBeVisible();
  },
});

/**
 * The press opens the page and waits for the redirect to land.
 *
 * @summary The step steps aside only once the account is stored, so a person still finishing in
 * the browser sees the step where they left it.
 */
export const WaitsOutTheBrowserOncePressed = meta.story({
  play: async ({ args, canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Open the sign-in page' }));

    await expect(args.onConnected).toHaveBeenCalled();
  },
});

/** The same step in the dark scheme. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
