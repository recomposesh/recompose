import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { paintedBox } from '../../testing';
import { RecomposeMark } from './recompose-mark';

const meta = preview.meta({
  component: RecomposeMark,
  args: { className: 'size-16' },
});

/** The mark as the brand draws it: three concentric bands under the note. */
export const Basic = meta.story({
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('rect')).toHaveLength(3);
    await expect(canvasElement.querySelector('path')).toBeInTheDocument();
  },
});

/** The drawing the app icon is cut from, which is why the mark carries its whole canvas. */
export const CarriesTheMasterCanvas = meta.story({
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 1024 1024');
  },
});

/** The mark takes whatever size its surface gives it, down to a glyph beside a title. */
export const SizedByItsSurface = meta.story({
  args: { className: 'size-4' },
  play: async ({ canvasElement }) => {
    await expect(paintedBox(canvasElement.querySelector('svg')).height).toBe(16);
  },
});

/**
 * The four gradients one mark draws with, which belong to that mark alone.
 *
 * @summary A second mark on the same surface would paint through the first one's gradients if both
 * declared the same ids, so a surface holding two marks is what proves the ids differ.
 */
export const TwoMarksKeepTheirOwnGradients = meta.story({
  render: () => (
    <>
      <RecomposeMark className="size-8" />
      <RecomposeMark className="size-8" />
    </>
  ),
  play: async ({ canvasElement }) => {
    const gradients = [...canvasElement.querySelectorAll('linearGradient')].map(
      (drawn) => drawn.id,
    );

    await expect(gradients).toHaveLength(8);
    await expect(new Set(gradients).size).toBe(8);
  },
});
