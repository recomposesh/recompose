import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { paintedBox } from '../../testing';
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

/** The mark and the name a hidden title bar took away, standing together in the sidebar's band. */
export const Basic = meta.story({
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByRole('img', { name: 'recompose' })).toBeVisible();
    await expect(canvasElement.querySelectorAll('rect')).toHaveLength(3);
  },
});

/**
 * The name as the brand sets it, never as the interface font types it.
 *
 * @summary The word is drawn by the wordmark's own paths, so nothing here spells `recompose` in
 * whatever face the platform hands the rest of the chrome.
 */
export const TheBrandSetsTheName = meta.story({
  play: async ({ canvas }) => {
    await expect(canvas.queryByText('recompose')).toBeNull();
  },
});

/** The mark, drawn small enough to sit in a band the window controls also fit in. */
export const MarkFitsTheBand = meta.story({
  play: async ({ canvasElement }) => {
    const mark = canvasElement.querySelectorAll('svg')[0];

    await expect(paintedBox(mark).height).toBe(16);
    await expect(paintedBox(mark).width).toBe(16);
  },
});

/**
 * The mark and the name are lined up by one centre.
 *
 * @summary A lockup reads as two things stuck together the moment its parts sit on two centres,
 * and the descender in `recompose` is what pulls them apart if nothing accounts for it.
 */
export const MarkAndNameShareACentre = meta.story({
  play: async ({ canvasElement }) => {
    const [mark, word] = canvasElement.querySelectorAll('svg');
    const tile = mark?.getBoundingClientRect();
    const letters = word?.querySelector('path')?.getBoundingClientRect();
    const middleOf = (box: DOMRect | undefined) => (box?.top ?? 0) + (box?.height ?? 0) / 2;

    await expect(Math.abs(middleOf(letters) - middleOf(tile))).toBeLessThan(0.5);
  },
});
