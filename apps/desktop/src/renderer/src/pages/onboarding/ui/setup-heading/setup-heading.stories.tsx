import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { onASurface } from '../../testing/on-a-surface';
import { SetupHeading } from './setup-heading';

const meta = preview.meta({
  component: SetupHeading,
  args: { step: 'harnesses' as const },
  decorators: [onASurface],
});

/** A step heading, set in the face the brand uses for its own words. */
export const Basic = meta.story({
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('img', { name: 'Which harnesses do you use?' }),
    ).toBeVisible();
  },
});

/** A step that draws its own lockup rather than a heading draws nothing here. */
export const WithoutAnOutline = meta.story({
  args: { step: 'welcome' as const },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('svg')).toBeNull();
  },
});
