import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { paintedStyle } from '../../../../shared/testing';
import { onASurface } from '../../testing/on-a-surface';
import { SetupSonar } from './setup-sonar';

const meta = preview.meta({ component: SetupSonar, decorators: [onASurface] });

/** The field a waiting step sends out while nothing has landed. */
export const Basic = meta.story({
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('.sonar-ring')).toHaveLength(3);
  },
});

/** The rings start apart, so the field reads as one wave rather than three edges at once. */
export const TheRingsStartApart = meta.story({
  play: async ({ canvasElement }) => {
    const delays = [...canvasElement.querySelectorAll('.sonar-ring')].map(
      (ring) => paintedStyle(ring).animationDelay,
    );

    await expect(new Set(delays).size).toBe(3);
  },
});

/** It says nothing to a screen reader, because the standing beside it says it in words. */
export const SaysNothingToAScreenReader = meta.story({
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.queryAllByRole('img')).toHaveLength(0);
    await expect(canvasElement.querySelector('[aria-hidden="true"]')).not.toBeNull();
  },
});
