import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import type { JudgeSatelliteData } from './judge-satellite';

import { paintedBox, paintedStyle } from '../../../../shared/testing';
import { cardOnCanvas, inScheme } from '../../testing/canvas-flow.testkit';
import { JudgeSatellite } from './judge-satellite';

const advising: JudgeSatelliteData = {
  id: 'judge:fast:advisor',
  kind: 'judge',
  modelId: 'fast',
  routeNodeId: 'advisor',
  depth: 0,
  advises: 'route:fast',
  accountId: 'a1',
  providerModel: 'claude-haiku-5',
};

const meta = preview.meta({
  component: JudgeSatellite,
  args: { data: advising, selected: false },
  render: ({ data, selected }) => cardOnCanvas('judge', JudgeSatellite, data, selected),
});

/** The judge as it stands above its router: round, quiet, and named by what it judges with. */
export const Basic = meta.story({
  play: async ({ canvas }) => {
    const node = await canvas.findByRole('button', { name: 'Judge' });

    await expect(node).toBeVisible();
    await expect(canvas.getByTitle('claude-haiku-5')).toBeVisible();
  },
});

/** The silhouette is a circle, which is what says advisor beside a canvas of rectangles. */
export const TheSilhouetteIsRound = meta.story({
  play: async ({ canvas }) => {
    const node = await canvas.findByRole('button', { name: 'Judge' });
    const box = paintedBox(node);
    const radius = Number.parseFloat(paintedStyle(node).borderTopLeftRadius);

    await expect(box.width).toBe(box.height);
    await expect(radius).toBeGreaterThanOrEqual(box.width / 2);
  },
});

/** The node wears the router's own indigo, so a person reads which router it belongs to. */
export const ItWearsTheRouterTint = meta.story({
  play: async ({ canvas }) => {
    const node = await canvas.findByRole('button', { name: 'Judge' });
    const indigo = inScheme('rgb(94, 92, 230)', 'rgb(125, 122, 255)');

    await expect(paintedStyle(node).borderTopColor).toBe(indigo);
    await expect(paintedStyle(node).color).toBe(indigo);
  },
});

/** It takes far less room than a card, so it never crowds the row a router stands in. */
export const ItStandsSmallerThanEveryCard = meta.story({
  play: async ({ canvas }) => {
    const node = await canvas.findByRole('button', { name: 'Judge' });

    await expect(paintedBox(node).width).toBeLessThan(184);
    await expect(paintedBox(node).height).toBeLessThan(88);
  },
});

/** A selected judge rings in the router tint, which is what the inspector opens against. */
export const ASelectedJudgeRings = meta.story({
  args: { selected: true },
  play: async ({ canvas }) => {
    const node = await canvas.findByRole('button', { name: 'Judge' });

    await expect(node).toHaveAttribute('aria-pressed', 'true');
    await expect(paintedStyle(node).backgroundColor).not.toBe(
      inScheme('rgb(255, 255, 255)', 'rgb(40, 40, 44)'),
    );
  },
});

/** The judge in the dark scheme, where its ink and its line both read against the canvas. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
