import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { paintedBox, paintedStyle } from '../../testing';
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

/** A window-wide fall carries the eighty pieces the drawn frame carries. */
export const AcrossTheWindow = meta.story({
  args: { spread: 'window' as const },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('.confetti-fleck')).toHaveLength(80);
  },
});

/** Every fleck starts in its own column, so nothing falls in a single stripe. */
export const TheFallSpreadsAcrossTheWidth = meta.story({
  args: { spread: 'window' as const },
  play: async ({ canvasElement }) => {
    const columns = [...canvasElement.querySelectorAll('.confetti-fleck')].map(
      (fleck) => paintedStyle(fleck).insetInlineStart,
    );

    await expect(new Set(columns).size).toBeGreaterThan(40);
  },
});

/** It reaches the whole window rather than the box it was written into. */
export const TheFallClaimsTheWindow = meta.story({
  args: { spread: 'window' as const },
  play: async ({ canvasElement }) => {
    const laid = canvasElement.querySelector('[data-confetti="window"]');

    await expect(paintedStyle(laid).position).toBe('fixed');
    await expect(paintedStyle(laid).pointerEvents).toBe('none');
    await expect(paintedBox(laid).width).toBe(window.innerWidth);
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
