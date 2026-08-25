import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { paintedStyle } from '../../testing';
import { ConfettiBurst } from './confetti-burst';

const meta = preview.meta({
  component: ConfettiBurst,
  decorators: [
    (Story) => (
      <div className="relative size-64 rounded-panel border border-line-subtle bg-surface-card">
        <Story />
      </div>
    ),
  ],
});

/** The burst that marks a thing finished, laid over whatever it is celebrating. */
export const Basic = meta.story({
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('.confetti-piece')).toHaveLength(12);
  },
});

/** It never takes a pointer, so the control it lands over stays pressable throughout. */
export const TakesNoPointer = meta.story({
  play: async ({ canvasElement }) => {
    await expect(paintedStyle(canvasElement.querySelector('[aria-hidden]')).pointerEvents).toBe(
      'none',
    );
  },
});

/** Every piece takes a node kind's own tint, so the burst reads as the app's pieces. */
export const TintedByNodeKind = meta.story({
  play: async ({ canvasElement }) => {
    const tints = [...canvasElement.querySelectorAll('.confetti-piece')].map(
      (piece) => getComputedStyle(piece).backgroundColor,
    );

    await expect(new Set(tints).size).toBeGreaterThan(3);
    await expect(tints).not.toContain('rgba(0, 0, 0, 0)');
  },
});

/** Nothing about it reaches a screen reader, because a burst says nothing a caption does not. */
export const SaysNothingToAScreenReader = meta.story({
  play: async ({ canvas }) => {
    await expect(canvas.queryAllByRole('img')).toHaveLength(0);
  },
});
