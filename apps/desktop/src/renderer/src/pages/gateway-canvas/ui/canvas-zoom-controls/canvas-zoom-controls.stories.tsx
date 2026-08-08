import { expect, fn, waitFor } from 'storybook/test';

import preview from '#.storybook/preview';

import { paintedBox, paintedStyle, pressedByKeyboard } from '../../../../shared/testing';
import { inCanvasFlow, seat } from '../../testing/canvas-flow.testkit';
import { CanvasZoomControls } from './canvas-zoom-controls';

type Reached = {
  findByRole: (role: string, options: { name: string }) => Promise<HTMLElement>;
  findByText: (text: string) => Promise<HTMLElement>;
};

const seats = [
  seat('gateway', 'gateway', 'Gateway', { x: 0, y: 0 }),
  seat('target:anthropic', 'target', 'Anthropic', { x: 520, y: 220 }),
];

const meta = preview.meta({
  args: { onTidy: fn() },
  component: CanvasZoomControls,
  decorators: [inCanvasFlow(seats, { x: 0, y: 0, zoom: 1 })],
});

function forScheme(light: string, dark: string): string {
  return document.documentElement.classList.contains('scheme-dark') ? dark : light;
}

const zoomIn = { role: 'button', name: 'Zoom in' };

async function zoomedBy(
  canvas: Reached,
  press: (element: Element) => Promise<void>,
  tool: string,
): Promise<() => number> {
  const card = await canvas.findByText('Gateway');
  const stood = paintedBox(card).width;

  await press(await canvas.findByRole('button', { name: tool }));

  return () => paintedBox(card).width - stood;
}

/** The tools cluster in its corner, which is every act the viewport answers to. */
export const Basic = meta.story({});

/** The cluster shares the furniture card and pads its tools by the template's three. */
export const TheToolsShareTheFurnitureCard = meta.story({
  play: async ({ canvas }) => {
    const cluster = (await canvas.findByRole('button', zoomIn)).parentElement;

    await expect(paintedStyle(cluster).padding).toBe('3px');
    await expect(paintedStyle(cluster).borderRadius).toBe('9px');
    await expect(paintedStyle(cluster).backgroundColor).toBe(
      forScheme('rgba(255, 255, 255, 0.92)', 'rgba(30, 30, 33, 0.92)'),
    );
  },
});

/** Each tool stands on the shipped push button, so the canvas spends no size of its own. */
export const EachToolStandsOnThePushButton = meta.story({
  play: async ({ canvas }) => {
    const tool = await canvas.findByRole('button', { name: 'Zoom to fit' });

    await expect(paintedBox(tool).height).toBe(28);
    await expect(paintedStyle(tool).fontWeight).toBe('500');
  },
});

/** Zooming in draws the cards larger, which is the whole of what the tool promises. */
export const ZoomingInEnlargesTheCards = meta.story({
  play: async ({ canvas, userEvent }) => {
    const grown = await zoomedBy(canvas, userEvent.click, 'Zoom in');

    await waitFor(async () => expect(grown()).toBeGreaterThan(0));
  },
});

/** Zooming out draws them smaller, so a person can back away from a wide composition. */
export const ZoomingOutShrinksTheCards = meta.story({
  play: async ({ canvas, userEvent }) => {
    const shrunk = await zoomedBy(canvas, userEvent.click, 'Zoom out');

    await waitFor(async () => expect(shrunk()).toBeLessThan(0));
  },
});

/** Fitting brings a card that had wandered off the pane back inside it. */
export const FittingBringsEveryCardIntoView = meta.story({
  play: async ({ canvas, canvasElement, userEvent }) => {
    const pane = paintedBox(canvasElement.firstElementChild);
    const wandered = await canvas.findByText('Anthropic');

    await expect(paintedBox(wandered).right).toBeGreaterThan(pane.right);

    await userEvent.click(await canvas.findByRole('button', { name: 'Zoom to fit' }));

    await waitFor(async () => expect(paintedBox(wandered).right).toBeLessThan(pane.right));
  },
});

/** Tidy hands the ask back to the canvas, which owns the arrangement the viewport does not. */
export const TidyAnswersItsControl = meta.story({
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Tidy' }));

    await expect(args.onTidy).toHaveBeenCalled();
  },
});

/** The cluster carries its four tools and no lock, because the canvas is never frozen. */
export const TheClusterCarriesOnlyItsFourTools = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', zoomIn)).toBeVisible();
    await expect(canvas.getAllByRole('button')).toHaveLength(4);
    await expect(canvas.queryByRole('button', { name: 'toggle interactivity' })).toBeNull();
  },
});

/** A tool answers the keyboard, so the viewport is reachable without a pointer. */
export const TheToolsPressFromTheKeyboard = meta.story({
  play: async ({ canvas, userEvent }) => {
    const card = await canvas.findByText('Gateway');
    const stood = paintedBox(card).width;

    await pressedByKeyboard(canvas, zoomIn, userEvent.keyboard, '{Enter}');

    await waitFor(async () => expect(paintedBox(card).width).toBeGreaterThan(stood));
  },
});

/** The tool a tab reaches shows where it landed, rather than moving focus in silence. */
export const TheReachedToolShowsItsFocus = meta.story({
  play: async ({ canvas, userEvent }) => {
    (await canvas.findByRole('button', zoomIn)).focus();
    await userEvent.tab();

    const reached = await canvas.findByRole('button', { name: 'Zoom out' });

    await waitFor(async () => expect(reached).toHaveFocus());
    await expect(paintedStyle(reached).outlineWidth).toBe('2px');
  },
});
