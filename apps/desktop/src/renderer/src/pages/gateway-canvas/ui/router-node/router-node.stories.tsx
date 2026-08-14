import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import type { RouterNodeData } from './router-node';

import { paintedBox, paintedStyle } from '../../../../shared/testing';
import { cardOnCanvas, inScheme } from '../../testing/canvas-flow.testkit';
import { RouterNode } from './router-node';

const spreading: RouterNodeData = {
  id: 'route:fast:r1',
  kind: 'router',
  modelId: 'fast',
  routeNodeId: 'r1',
  depth: 0,
  mode: 'failover',
  displayName: undefined,
  childCount: 2,
  onAddChild: () => {},
};

const named: RouterNodeData = { ...spreading, displayName: 'Ladder' };

const empty: RouterNodeData = { ...spreading, childCount: 0 };

const rotating: RouterNodeData = { ...spreading, mode: 'round-robin', childCount: 3 };

const CARD_WIDTH = 184;
const CARD_HEIGHT = 88;

function framePaths(card: HTMLElement): SVGPathElement[] {
  return [...card.querySelectorAll<SVGPathElement>('[data-chamfer] path')];
}

const meta = preview.meta({
  component: RouterNode,
  args: { data: spreading, selected: false },
  render: ({ data, selected }) => cardOnCanvas('router', RouterNode, data, selected),
});

/** A router spreading requests over the children under it, which is what the ladder reads as. */
export const Basic = meta.story({});

const BORDER_WEIGHT = 1.5;

/** The frame draws two concentric lines of equal weight, the inner five pixels inside the outer. */
export const TheFrameDrawsItsBorderTwice = meta.story({
  play: async ({ canvas }) => {
    const card = await canvas.findByRole('button', { name: /Failover/ });
    const [outer, inner] = framePaths(card);

    await expect(paintedStyle(outer).strokeWidth).toBe(`${String(BORDER_WEIGHT)}px`);
    await expect(paintedStyle(inner).strokeWidth).toBe(`${String(BORDER_WEIGHT)}px`);

    const outerBox = outer?.getBBox() ?? new DOMRect();
    const innerBox = inner?.getBBox() ?? new DOMRect();

    await expect(outerBox.width + BORDER_WEIGHT).toBeCloseTo(CARD_WIDTH, 0);
    await expect(outerBox.height + BORDER_WEIGHT).toBeCloseTo(CARD_HEIGHT, 0);
    await expect(innerBox.y - outerBox.y).toBeCloseTo(5, 1);
    await expect(outerBox.height - innerBox.height).toBeCloseTo(10, 1);
  },
});

/** The drawn frame fills the card it bounds, rather than sitting inside a box of its own. */
export const TheFrameFillsTheCardItBounds = meta.story({
  play: async ({ canvas }) => {
    const card = await canvas.findByRole('button', { name: /Failover/ });
    const drawn = paintedBox(card.querySelector('[data-chamfer]'));
    const frame = paintedBox(card);

    await expect(Math.round(drawn.width)).toBe(CARD_WIDTH);
    await expect(Math.round(drawn.height)).toBe(CARD_HEIGHT);
    await expect(Math.round(drawn.x - frame.x)).toBe(0);
    await expect(Math.round(drawn.y - frame.y)).toBe(0);
  },
});

/** No line of the card runs into the inner border the chamfer brings in toward the text. */
export const TheTextClearsTheInnerLine = meta.story({
  play: async ({ canvas }) => {
    const card = await canvas.findByRole('button', { name: /Failover/ });
    const frame = paintedBox(card);
    const mono = paintedBox(card.querySelector('.font-mono'));
    const fromCenter = Math.abs(mono.bottom - (frame.y + CARD_HEIGHT / 2));
    const innerEdge = 5.96 + (fromCenter / (CARD_HEIGHT / 2 - 5.75)) * (16.39 - 5.96);

    await expect(mono.x - frame.x).toBeGreaterThan(innerEdge + BORDER_WEIGHT);
  },
});

/** Both lines paint the router's own indigo, which no other node on this canvas wears. */
export const BothLinesPaintTheRouterTint = meta.story({
  play: async ({ canvas }) => {
    const [outer, inner] = framePaths(await canvas.findByRole('button', { name: /Failover/ }));
    const indigo = inScheme('rgb(94, 92, 230)', 'rgb(125, 122, 255)');

    await expect(paintedStyle(outer).stroke).toBe(indigo);
    await expect(paintedStyle(inner).stroke).toBe(indigo);
  },
});

/** The resting fill stays the plain card fill, because a tinted fill is the interaction language. */
export const TheRestingFillStaysThePlainCardFill = meta.story({
  play: async ({ canvas }) => {
    const [outer] = framePaths(await canvas.findByRole('button', { name: /Failover/ }));

    await expect(paintedStyle(outer).fill).toBe(inScheme('rgb(255, 255, 255)', 'rgb(40, 40, 44)'));
  },
});

/** The left and right edges come to a point, and the cable's anchor meets the point it makes. */
export const TheChamferMeetsTheCableAtThePoint = meta.story({
  play: async ({ canvas, canvasElement }) => {
    const card = await canvas.findByRole('button', { name: /Failover/ });
    const [outer] = framePaths(card);

    await expect(outer?.isPointInFill(new DOMPoint(183, CARD_HEIGHT / 2))).toBe(true);
    await expect(outer?.isPointInFill(new DOMPoint(183, 6))).toBe(false);
    await expect(outer?.isPointInFill(new DOMPoint(1, CARD_HEIGHT / 2))).toBe(true);
    await expect(outer?.isPointInFill(new DOMPoint(1, 6))).toBe(false);

    const port = paintedBox(canvasElement.querySelector('.react-flow__handle.source'));
    const frame = paintedBox(card);

    await expect(Math.round(port.x + port.width / 2 - frame.right)).toBe(0);
    await expect(Math.round(port.y + port.height / 2 - (frame.y + frame.height / 2))).toBe(0);
  },
});

/** The footprint stays what every other card measures, so the column pitch never moves. */
export const TheFootprintStaysWhatEveryCardMeasures = meta.story({
  play: async ({ canvas }) => {
    const frame = paintedBox(await canvas.findByRole('button', { name: /Failover/ }));

    await expect(Math.round(frame.width)).toBe(CARD_WIDTH);
    await expect(Math.round(frame.height)).toBe(CARD_HEIGHT);
  },
});

/** A router a person named keeps the mode on the mono line under the name it was given. */
export const ANamedRouterReadsItsNameOverTheMode = meta.story({
  args: { data: named },
  play: async ({ canvas }) => {
    const card = await canvas.findByRole('button', { name: /Ladder/ });

    await expect(card).toHaveTextContent('Ladder');
    await expect(card).toHaveTextContent('failover');
  },
});

/** A router wearing its derived name spends the mono line on the child count instead. */
export const ADerivedNameSpendsTheMonoLineOnTheChildCount = meta.story({
  args: { data: rotating },
  play: async ({ canvas }) => {
    const card = await canvas.findByRole('button', { name: /Round-robin/ });

    await expect(card).toHaveTextContent('Round-robin');
    await expect(card).toHaveTextContent('3 children');
    await expect(card).not.toHaveTextContent('round-robin');
  },
});

/** A router holding no child wears the dashed ghost treatment a removed target already wears. */
export const AnIncompleteRouterWearsTheGhostTreatment = meta.story({
  args: { data: empty },
  play: async ({ canvas }) => {
    const card = await canvas.findByRole('button', { name: /Failover/ });
    const [outer, inner] = framePaths(card);

    await expect(card).toHaveTextContent('no child');
    await expect(paintedStyle(outer).strokeDasharray).not.toBe('none');
    await expect(paintedStyle(inner).strokeDasharray).not.toBe('none');
  },
});

/** A selected router rings in its own tint, which is what the inspector opens against. */
export const ASelectedRouterRingsInItsOwnTint = meta.story({
  args: { selected: true },
  play: async ({ canvas }) => {
    const card = await canvas.findByRole('button', { name: /Failover/ });
    const [outer] = framePaths(card);

    await expect(card).toHaveAttribute('aria-pressed', 'true');
    await expect(paintedStyle(outer).fill).not.toBe(
      inScheme('rgb(255, 255, 255)', 'rgb(40, 40, 44)'),
    );
  },
});
