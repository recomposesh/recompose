import { expect } from 'storybook/test';

import preview from '#.storybook/preview';
import { withSidebarSurface } from '#.storybook/sidebar-surface';

import { UpdateCheckNotice } from './update-check-notice';

const meta = preview.meta({
  component: UpdateCheckNotice,
  args: { version: '0.3.0', onDismiss: () => undefined },
  decorators: [withSidebarSurface],
});

/** The seconds after a person chooses the menu item, with nothing to dismiss yet. */
export const Asking = meta.story({
  args: { check: { standing: 'asking' } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Checking for updates…')).toBeVisible();
    await expect(canvas.queryByRole('button', { name: 'Dismiss' })).toBeNull();
  },
});

/** The answer most checks give, naming the version the person already runs. */
export const AlreadyNewest = meta.story({
  args: { check: { standing: 'current' } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Recompose 0.3.0 is the newest version.')).toBeVisible();
    await expect(await canvas.findByRole('button', { name: 'Dismiss' })).toBeVisible();
  },
});

/** A newer version the check turned up, on its way down behind the notice. */
export const VersionFound = meta.story({
  args: { check: { standing: 'found', version: '0.4.0' } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Recompose 0.4.0 is downloading.')).toBeVisible();
  },
});

/** The one outcome the hourly check keeps to the log, which an asked-for check says out loud. */
export const CheckRefused = meta.story({
  args: { check: { standing: 'failed', reason: 'the release feed refused the request' } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Update check failed')).toBeVisible();
    await expect(await canvas.findByText('the release feed refused the request')).toBeVisible();
  },
});

/** The refusal in the dark scheme, where the reason still reads against the card. */
export const DarkScheme = meta.story({
  args: { check: { standing: 'failed', reason: 'the release feed refused the request' } },
  globals: { theme: 'dark' },
});
