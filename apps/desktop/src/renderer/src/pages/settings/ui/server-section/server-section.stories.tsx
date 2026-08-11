import { expect } from 'storybook/test';

import preview from '#.storybook/preview';
import { inSettingsColumn } from '#.storybook/settings-column';

import { ServerSection } from './server-section';

const meta = preview.meta({
  component: ServerSection,
  decorators: [inSettingsColumn],
});

/** Loopback is the safe default, with any host available to a person who chooses it. */
export const Basic = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('textbox', { name: 'Bind address' })).toHaveValue(
      '127.0.0.1',
    );
    await expect(await canvas.findByText(/Use 0\.0\.0\.0 or another host/iu)).toBeVisible();
    await expect(canvas.queryByRole('textbox', { name: 'Port' })).toBeNull();
    await expect(canvas.queryByRole('switch', { name: 'Require API token' })).toBeNull();
    await expect(
      await canvas.findByRole('switch', { name: 'Start gateways on launch' }),
    ).not.toHaveAttribute('aria-disabled');
    await expect(canvas.queryByText('Waits on launch-time start.')).toBeNull();
  },
});

/** The same group under the dark scheme. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
