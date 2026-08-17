import { expect } from 'storybook/test';

import preview from '#.storybook/preview';
import { withSidebarSurface } from '#.storybook/sidebar-surface';

import { UpdateReadyCard } from './update-ready-card';

const readyBridge = {
  overrides: {
    'updates:get': async () =>
      Promise.resolve({
        ok: true as const,
        value: { standing: 'ready' as const, version: '0.4.0' },
      }),
  },
};

const meta = preview.meta({
  component: UpdateReadyCard,
  parameters: { bridge: readyBridge },
  decorators: [withSidebarSurface],
});

/** A downloaded version waiting under the Get started panel, naming both versions. */
export const Ready = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('region', { name: 'Update ready' })).toBeVisible();
    await expect(await canvas.findByText('0.3.0 → 0.4.0')).toBeVisible();
    await expect(await canvas.findByRole('button', { name: 'Restart to update' })).toBeVisible();
  },
});

/** The same waiting version in the dark scheme, where the wash reads on the lifted surface. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });

/**
 * A quiet channel, which is most sessions: the card renders nothing at all.
 *
 * @summary No play function runs here, because the story shows an absence and an absence assertion
 * would need a settle point this component never provides.
 */
export const NothingWaiting = meta.story({ parameters: { bridge: {} } });
