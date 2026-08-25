import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { SetupTagline } from './setup-tagline';

const meta = preview.meta({
  component: SetupTagline,
  decorators: [
    (Story) => (
      <div className="bg-surface-content p-10">
        <Story />
      </div>
    ),
  ],
});

/** The tagline the welcome step opens on, set in outlines rather than in an embedded face. */
export const Basic = meta.story({
  play: async ({ canvas, canvasElement }) => {
    const tagline = await canvas.findByRole('img', {
      name: 'Every model, in every harness, one gateway to run.',
    });

    await expect(tagline).toBeVisible();
    await expect(canvasElement.querySelectorAll('svg path')).toHaveLength(2);
  },
});

/** Both lines share one baseline grid, so the second never rides higher than the first. */
export const LinesShareABaseline = meta.story({
  play: async ({ canvasElement }) => {
    const [first, second] = [...canvasElement.querySelectorAll('svg')];

    if (!first || !second) {
      throw new Error('The tagline drew fewer than two lines.');
    }

    await expect(first.viewBox.baseVal.y).toBe(second.viewBox.baseVal.y);
    await expect(first.viewBox.baseVal.height).toBe(second.viewBox.baseVal.height);
    await expect(first.getBoundingClientRect().width).toBeGreaterThan(
      second.getBoundingClientRect().width,
    );
  },
});

/** A larger setting keeps the proportion, because the size drives both axes from one number. */
export const Large = meta.story({
  args: { size: 64 },
  play: async ({ canvasElement }) => {
    const [first] = [...canvasElement.querySelectorAll('svg')];

    if (!first) {
      throw new Error('The tagline drew nothing to measure.');
    }

    await expect(first.getBoundingClientRect().height).toBeCloseTo((970 / 1000) * 64, 0);
  },
});
