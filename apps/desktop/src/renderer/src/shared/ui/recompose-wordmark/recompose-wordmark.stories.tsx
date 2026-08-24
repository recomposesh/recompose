import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { paintedStyle } from '../../testing';
import { RecomposeWordmark } from './recompose-wordmark';

const meta = preview.meta({
  component: RecomposeWordmark,
  decorators: [
    (Story) => (
      <div className="bg-surface-toolbar p-4 text-ink-secondary">
        <Story />
      </div>
    ),
  ],
});

function drawnOn(canvasElement: HTMLElement) {
  const word = canvasElement.querySelector('svg');
  const letters = word?.querySelector('path');

  if (!word || !letters) {
    throw new Error('The wordmark drew nothing to measure.');
  }

  const ink = letters.getBBox();
  const box = word.viewBox.baseVal;

  return {
    lettersMiddle: ink.y + ink.height / 2,
    boxMiddle: box.y + box.height / 2,
    lettersOnScreen: letters.getBoundingClientRect(),
    inkStartsAt: word.getBBox().x,
  };
}

/** The name as the brand sets it, which is a drawing rather than a line of type. */
export const Basic = meta.story({
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByRole('img', { name: 'recompose' })).toBeVisible();
    await expect(canvasElement.querySelectorAll('svg path').length).toBeGreaterThan(1);
  },
});

/**
 * The word alone, without the note the web lockup draws beside it.
 *
 * @summary The mark stands next to this in its own colors, so a wordmark carrying the note too
 * would draw it twice. The note opens the lockup at nought, so ink starting at the word's own edge
 * is what says it was left out.
 */
export const CarriesTheWordAlone = meta.story({
  play: async ({ canvasElement }) => {
    await expect(drawnOn(canvasElement).inkStartsAt).toBe(42);
  },
});

/**
 * The letters sit in the middle of the box the wordmark takes up.
 *
 * @summary Only `p` descends, so a box drawn to the ink hangs lower than the letters do, and
 * anything centring that box stands the word above the mark it sits beside. Padding the box above
 * by the reach of the descender puts the letters back on the centre a lockup lines up by.
 */
export const LettersCentreInTheirBox = meta.story({
  play: async ({ canvasElement }) => {
    const drawn = drawnOn(canvasElement);

    await expect(drawn.lettersMiddle).toBeCloseTo(drawn.boxMiddle, 3);
  },
});

/** The word is set by how tall its letters read, never by the box that holds them. */
export const SetByItsLetters = meta.story({
  args: { letters: 16 },
  play: async ({ canvasElement }) => {
    await expect(Math.round(drawnOn(canvasElement).lettersOnScreen.height)).toBe(16);
  },
});

/** The word takes the ink of whatever it stands on rather than carrying a color of its own. */
export const TakesTheInkAroundIt = meta.story({
  play: async ({ canvasElement }) => {
    const drawn = canvasElement.querySelector('svg path');

    await expect(paintedStyle(drawn).fill).toBe(
      paintedStyle(canvasElement.firstElementChild).color,
    );
  },
});
