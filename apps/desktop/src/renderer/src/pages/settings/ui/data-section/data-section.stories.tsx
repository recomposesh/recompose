import { expect } from 'storybook/test';

import preview from '#.storybook/preview';
import { inSettingsColumn } from '#.storybook/settings-column';
import { reportingSystem } from '#.storybook/system-report';

import { DataSection } from './data-section';

const meta = preview.meta({
  component: DataSection,
  parameters: reportingSystem(),
  decorators: [inSettingsColumn],
});

/** The config folder written the way a person reads it, with no account name in it. */
export const Basic = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('~/Library/Application Support/recompose')).toBeVisible();
    await expect(await canvas.findByRole('button', { name: 'Reveal in Finder' })).toBeVisible();
  },
});

/** On Windows the same act names the browser that platform ships. */
export const OnWindows = meta.story({
  parameters: reportingSystem({
    fileBrowser: 'explorer',
    configFolder: String.raw`~\AppData\Roaming\recompose`,
  }),
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: 'Show in Explorer' })).toBeVisible();
  },
});

/** On Linux the label names a role rather than a product. */
export const OnLinux = meta.story({
  parameters: reportingSystem({
    fileBrowser: 'file-manager',
    configFolder: '~/.config/recompose',
  }),
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: 'Open folder' })).toBeVisible();
  },
});

/** The retention row offers three windows with the stored one standing. */
export const TheRetentionRow = meta.story({
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('radiogroup', { name: 'Usage retention' }),
    ).toBeInTheDocument();
    await expect(await canvas.findByRole('radio', { name: '30 days' })).toBeChecked();
  },
});

/** The same group under the dark scheme. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
