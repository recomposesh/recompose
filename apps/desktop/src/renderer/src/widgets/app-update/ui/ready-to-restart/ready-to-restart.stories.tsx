import { expect } from 'storybook/test';

import preview from '#.storybook/preview';
import { withSidebarSurface } from '#.storybook/sidebar-surface';

import { ReadyToRestart } from './ready-to-restart';

const meta = preview.meta({
  component: ReadyToRestart,
  args: { from: '1.2.0', to: '1.3.0' },
  decorators: [withSidebarSurface],
});

/**
 * The card drawn from the two versions it was handed, and nothing else.
 *
 * @summary These versions match no fixture anywhere, so what stands here can only have come
 * through the props. Which query fills each side, and where the card sits among the surfaces the
 * widget chooses between, is what the AppUpdateCard story answers instead.
 */
export const Ready = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('region', { name: 'Update ready' })).toBeVisible();
    await expect(await canvas.findByText('1.2.0 → 1.3.0')).toBeVisible();
    await expect(await canvas.findByRole('button', { name: 'Restart to update' })).toBeVisible();
  },
});

/** The same card in the dark scheme, where the wash reads on the lifted surface. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
