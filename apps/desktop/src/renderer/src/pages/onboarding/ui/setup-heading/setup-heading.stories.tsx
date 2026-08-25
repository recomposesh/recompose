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

/** A step whose heading has no outline yet draws nothing rather than falling back to a serif. */
export const WithoutAnOutline = meta.story({
  args: { step: 'waiting' as const },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('svg')).toBeNull();
  },
});
