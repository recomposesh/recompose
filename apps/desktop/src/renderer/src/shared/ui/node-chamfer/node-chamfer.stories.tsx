import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { CHAMFERED_CARD, NodeChamfer } from './node-chamfer';

const meta = preview.meta({
  component: NodeChamfer,
  decorators: [
    (Story) => (
      <div className={`relative h-22 w-46 node-card node-tint-router ${CHAMFERED_CARD}`}>
        <Story />
      </div>
    ),
  ],
});

/** The router's silhouette: an outer edge and the keyline five pixels inside it. */
export const Basic = meta.story({
  play: async ({ canvasElement }) => {
    const drawn = canvasElement.querySelector('svg');

    if (!drawn) {
      throw new Error('The chamfer drew nothing.');
    }

    await expect(drawn).toHaveAttribute('aria-hidden', 'true');
    await expect(drawn.querySelectorAll('path')).toHaveLength(2);
  },
});

/** It takes its fill and its line from the card it stands in, so one state table paints both. */
export const ItReadsTheCardsOwnTint = meta.story({
  play: async ({ canvasElement }) => {
    const [fill] = [...(canvasElement.querySelector('svg')?.querySelectorAll('path') ?? [])];

    if (!fill) {
      throw new Error('The chamfer drew no fill.');
    }

    await expect(getComputedStyle(fill).stroke).not.toBe('none');
  },
});
