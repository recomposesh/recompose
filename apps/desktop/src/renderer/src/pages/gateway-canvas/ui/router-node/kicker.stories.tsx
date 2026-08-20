import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { fitsItsPane, paintedBox, paintedStyle } from '../../../../shared/testing';
import { cardOnCanvas } from '../../testing/canvas-flow.testkit';
import { RouterNode } from './router-node';
import { judgingRouter, rotatingRouter } from './router-node.testkit';

/** The chip leading the kicker row, which is the silhouette's own mark. */
function chipOf(card: HTMLElement): Element | null {
  return card.querySelector(':scope > span')?.children[0] ?? null;
}

/** The word beside that chip, whichever way the row has decided to spend its room. */
function kickerOf(card: HTMLElement): Element | null {
  return card.querySelector(':scope > span')?.children[1] ?? null;
}

const meta = preview.meta({
  component: RouterNode,
  args: { data: judgingRouter, selected: false },
  render: ({ data, selected }) => cardOnCanvas('router', RouterNode, data, selected),
});

/**
 * The kicker beside a mode pill, which keeps its glyph and yields the word to the pill.
 *
 * @summary The pill already names the mode and the chamfered silhouette already says router, so
 * the word is the one thing on that row nothing else is saying twice. It stays in the accessible
 * name, because a reader who cannot see the silhouette is owed the kind of card this is.
 */
export const TheKickerYieldsItsWordToAModePill = meta.story({
  play: async ({ canvas }) => {
    const card = await canvas.findByRole('button', { name: /Conditional/ });

    await expect(card).toHaveAccessibleName(/Router/u);
    await expect(paintedBox(kickerOf(card)).width).toBeLessThan(2);
    await expect(paintedBox(chipOf(card)).width).toBeGreaterThan(12);
  },
});

/** A router wearing no pill has the room, so the kicker reads its word the way every card does. */
export const TheKickerKeepsItsWordWithoutAPill = meta.story({
  args: { data: rotatingRouter },
  play: async ({ canvas }) => {
    const card = await canvas.findByRole('button', { name: /Round-robin/ });

    await expect(paintedBox(kickerOf(card)).width).toBeGreaterThan(20);
  },
});

/**
 * The kicker on a plain card spends no ellipsis, because it has the room to read whole.
 *
 * @summary A kicker cut to "ROU…" names nothing at all, which is worse than the row it was
 * protecting: the word is short and fixed, so the row yields it whole or keeps it whole.
 */
export const NoKickerEverTruncates = meta.story({
  args: { data: rotatingRouter },
  play: async ({ canvas }) => {
    const plain = await canvas.findByRole('button', { name: /Round-robin/ });

    await expect(fitsItsPane(kickerOf(plain))).toBe(true);
    await expect(paintedStyle(kickerOf(plain)).textOverflow).not.toBe('ellipsis');
  },
});

/** The crowded card spends no ellipsis either, because the word left rather than being cut. */
export const TheCrowdedKickerSpendsNoEllipsis = meta.story({
  play: async ({ canvas }) => {
    const judged = await canvas.findByRole('button', { name: /Conditional/ });

    await expect(paintedStyle(kickerOf(judged)).textOverflow).not.toBe('ellipsis');
  },
});

/** The crowded kicker row in the dark scheme, where the pill has to stay legible on its own. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
