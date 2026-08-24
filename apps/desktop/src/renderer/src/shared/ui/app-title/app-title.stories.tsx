import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { paintedBox, paintedStyle } from '../../testing';
import { AppTitle } from './app-title';

const meta = preview.meta({
  component: AppTitle,
  decorators: [
    (Story) => (
      <aside aria-label="Sidebar" className="flex items-center gap-4 bg-surface-sidebar p-2.5">
        <Story />
      </aside>
    ),
  ],
});

/** The name and the mark a hidden title bar took away, standing together in the sidebar's band. */
export const Basic = meta.story({
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByText('recompose')).toBeVisible();
    await expect(canvasElement.querySelector('svg')).toBeInTheDocument();
  },
});

/** The mark, drawn small enough to sit in a band the window controls also fit in. */
export const MarkFitsTheBand = meta.story({
  play: async ({ canvasElement }) => {
    const mark = canvasElement.querySelector('svg');

    await expect(paintedBox(mark).height).toBe(16);
    await expect(paintedBox(mark).width).toBe(16);
  },
});

/**
 * The two gradients each mark draws with, which belong to that mark alone.
 *
 * @summary A second mark on the same surface would paint through the first one's gradients if both
 * declared the same ids, so a title that renders twice is what proves the ids differ.
 */
export const TwoMarksKeepTheirOwnGradients = meta.story({
  render: () => (
    <>
      <AppTitle />
      <AppTitle />
    </>
  ),
  play: async ({ canvasElement }) => {
    const gradients = [...canvasElement.querySelectorAll('linearGradient')].map(
      (drawn) => drawn.id,
    );

    await expect(gradients).toHaveLength(4);
    await expect(new Set(gradients).size).toBe(4);
  },
});

/** The name, drawn in the quieter ink the band's other contents take. */
export const QuietAgainstTheBand = meta.story({
  play: async ({ canvas }) => {
    const title = await canvas.findByText('recompose');

    await expect(paintedStyle(title).fontSize).toBe('12px');
  },
});
