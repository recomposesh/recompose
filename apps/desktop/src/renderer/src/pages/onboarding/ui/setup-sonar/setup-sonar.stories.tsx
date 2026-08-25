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

/**
 * No ring paints wide before its turn, so the field opens from the middle outward.
 *
 * @summary A ring waiting out its delay held its own full size until the fill mode was named, so
 * the field opened with the widest ring already drawn. Which branch answers depends on the motion
 * preference the run carries, and both have an honest reading: a moving field holds the start
 * state, and a still one stands quiet at rest.
 */
export const NoRingStartsWide = meta.story({
  play: async ({ canvasElement }) => {
    for (const ring of canvasElement.querySelectorAll('.sonar-ring')) {
      const painted = paintedStyle(ring);

      await expect(
        painted.animationName === 'none' ? painted.opacity : painted.animationFillMode,
      ).toMatch(/backwards|0\.18/u);
    }
  },
});
