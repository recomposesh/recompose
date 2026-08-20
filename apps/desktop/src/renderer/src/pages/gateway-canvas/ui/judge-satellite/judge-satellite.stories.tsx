import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import type { JudgeSatelliteData } from './judge-satellite';

import { paintedBox, paintedCentre, paintedStyle } from '../../../../shared/testing';
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

/** The judge as it stands above its router: round, quiet, and nothing but the mark it wears. */
export const Basic = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: 'Judge' })).toBeVisible();
  },
});

/**
 * The mark inside the silhouette, which says the node reads a request rather than searches for one.
 *
 * @summary A magnifier is the vocabulary of finding something, and a judge finds nothing: it reads
 * what arrives and names the branch it belongs to. The brain says reading, which is the one thing
 * this node does.
 */
export const ItWearsTheBrainMark = meta.story({
  play: async ({ canvas, canvasElement }) => {
    const node = await canvas.findByRole('button', { name: 'Judge' });

    await expect(node.querySelector('[data-glyph="brain"]')).not.toBeNull();
    await expect(canvasElement.querySelector('[data-glyph="search"]')).toBeNull();
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

/**
 * The tie leaves by the side facing the router, which is the one beneath the silhouette.
 *
 * @summary The satellite seats centered over its router's top edge, so a port on the flank would
 * send the tie out sideways and back, crossing the very card it belongs to.
 */
export const TheTiePortFacesTheRouterBelow = meta.story({
  play: async ({ canvas, canvasElement }) => {
    const node = await canvas.findByRole('button', { name: 'Judge' });
    const port = paintedCentre(canvasElement.querySelector('.react-flow__handle'));

    await expect(port.y).toBeGreaterThanOrEqual(paintedBox(node).bottom);
    await expect(port.x).toBe(paintedCentre(node).x);
  },
});

/**
 * The dot the tie lands on wears the router's own line rather than the cable's blue.
 *
 * @summary The tie already draws in the router tint, so a blue dot at its end would read as one
 * more binding a request could travel down.
 */
export const TheTiePortWearsTheRouterTint = meta.story({
  play: async ({ canvasElement }) => {
    const port = canvasElement.querySelector('.react-flow__handle .port-dot');
    const indigo = inScheme('rgb(94, 92, 230)', 'rgb(125, 122, 255)');

    await expect(paintedStyle(port).borderTopColor).toBe(indigo);
    await expect(paintedStyle(port).backgroundColor).toBe(indigo);
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

/**
 * Nothing reads under the silhouette, which is the whole of what the node is.
 *
 * @summary A caption doubles the node's height for a string a person can only use once they are
 * already looking at the judge, and it hangs into the room the tie needs to read as dashed. The
 * model it classifies with stands in the inspector, which is where somebody goes to change it.
 */
export const NothingReadsUnderTheSilhouette = meta.story({
  play: async ({ canvas }) => {
    const node = await canvas.findByRole('button', { name: 'Judge' });
    const satellite = node.parentElement?.parentElement;

    await expect(canvas.queryByTitle('claude-haiku-5')).toBeNull();
    await expect(canvas.queryByText('claude-haiku-5')).toBeNull();
    await expect(Math.round(paintedBox(satellite).height - paintedBox(node).height)).toBe(0);
  },
});

/**
 * A judge standing out of a cooldown says so on the silhouette, and never counts the seconds down.
 *
 * @summary A number ticking on the canvas would pull the eye off the composition every second, so
 * the remaining window is a thing a person reads once, in the inspector. The standing rides the
 * outline rather than a word under the node, because a word there would put back the caption the
 * node just shed and take the tie's room with it.
 */
export const ACoolingJudgeSaysSoOnItsOutline = meta.story({
  args: { data: { ...advising, standing: 'cooling' } },
  play: async ({ canvas }) => {
    const node = await canvas.findByRole('button', { name: 'Judge' });

    await expect(paintedStyle(node).borderTopColor).not.toBe(
      inScheme('rgb(94, 92, 230)', 'rgb(125, 122, 255)'),
    );
    await expect(canvas.queryByText(/\d+\s*s/u)).toBeNull();
  },
});

/** A judge nothing is wrong with keeps the router's own line, so cooling reads as the exception. */
export const ARestingJudgeKeepsTheRouterLine = meta.story({
  play: async ({ canvas }) => {
    const node = await canvas.findByRole('button', { name: 'Judge' });

    await expect(paintedStyle(node).borderTopColor).toBe(
      inScheme('rgb(94, 92, 230)', 'rgb(125, 122, 255)'),
    );
  },
});

/** The judge in the dark scheme, where its ink and its line both read against the canvas. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
