import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { onASurface } from '../../testing/on-a-surface';
import { SetupNode } from './setup-node';

const meta = preview.meta({
  component: SetupNode,
  args: { kind: 'gateway' as const, name: 'My Gateway', under: ':8389' },
  decorators: [onASurface],
});

/** The gateway card, tinted the way the canvas tints its own. */
export const Gateway = meta.story({
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByText('My Gateway')).toBeVisible();
    await expect(await canvas.findByText('Gateway')).toBeVisible();
    await expect(canvasElement.querySelector('[data-setup-node="gateway"]')).not.toBeNull();
  },
});

/** Every kind takes its own tint, so no two parts of the graph read alike. */
export const EveryKindTakesItsOwnTint = meta.story({
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector('[data-setup-node="gateway"]');

    if (!card) {
      throw new Error('The card drew nothing to measure.');
    }

    const painted = getComputedStyle(card);

    await expect(painted.borderTopColor).not.toBe(painted.backgroundColor);
  },
});

/** The virtual model leads with the name and says the id a client sends underneath. */
export const VirtualModel = meta.story({
  args: { kind: 'virtual-model' as const, name: 'My model', under: 'claude-my-model' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('claude-my-model')).toBeVisible();
    await expect(await canvas.findByText('Virtual model')).toBeVisible();
  },
});

/** A target says whose turn it takes rather than repeating its own name. */
export const Subscription = meta.story({
  args: {
    kind: 'subscription' as const,
    name: 'Claude Opus 5',
    under: 'your plan · answering this turn',
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Subscription')).toBeVisible();
  },
});

/** The router wears the chamfer the canvas gives it, and no other card does. */
export const TheRouterIsChamfered = meta.story({
  args: { kind: 'router' as const, name: 'Round-robin', under: 'round-robin' },
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector('[data-setup-node="router"]');

    if (!card) {
      throw new Error('The router card drew nothing.');
    }

    await expect(card.querySelectorAll('svg path')).toHaveLength(2);
    await expect(getComputedStyle(card).borderTopWidth).toBe('0px');
  },
});

/** A rounded card carries a border rather than a drawn outline. */
export const ARoundedCardIsBordered = meta.story({
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector('[data-setup-node="gateway"]');

    if (!card) {
      throw new Error('The gateway card drew nothing.');
    }

    await expect(card.querySelectorAll('svg path')).toHaveLength(0);
    await expect(getComputedStyle(card).borderTopWidth).not.toBe('0px');
  },
});
