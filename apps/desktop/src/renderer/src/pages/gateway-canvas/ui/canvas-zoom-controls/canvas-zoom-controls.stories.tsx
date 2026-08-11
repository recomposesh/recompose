import { expect, waitFor } from 'storybook/test';

import preview from '#.storybook/preview';

import { paintedBox, paintedStyle, pressedByKeyboard } from '../../../../shared/testing';
import { inCanvasFlow, seat } from '../../testing/canvas-flow.testkit';
import { CanvasZoomControls } from './canvas-zoom-controls';

const seats = [
  seat('gateway', 'gateway', 'Gateway', { x: 0, y: 0 }),
  seat('target:anthropic', 'target', 'Anthropic', { x: 520, y: 220 }),
];

const meta = preview.meta({
  component: CanvasZoomControls,
  decorators: [inCanvasFlow(seats, { x: 0, y: 0, zoom: 1 })],
});

function forScheme(light: string, dark: string): string {
  return document.documentElement.classList.contains('scheme-dark') ? dark : light;
}

const zoomIn = { role: 'button', name: 'Zoom in' };

type Pressed = (element: Element) => Promise<void>;

async function zoomedBy(
  canvas: {
    findByRole: (role: string, options: { name: string }) => Promise<HTMLElement>;
    findByText: (text: string) => Promise<HTMLElement>;
  },
  press: Pressed,
  tool: string,
): Promise<() => number> {
  const card = await canvas.findByText('Gateway');
  const stood = paintedBox(card).width;

  await press(await canvas.findByRole('button', { name: tool }));

  return () => paintedBox(card).width - stood;
}

/** The pill in its corner: a step out, the live reading, a step in, and the fit. */
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

/** Each step stands on the full hit target, so a pointer meets the minimum size. */
export const EachToolMeetsTheHitTarget = meta.story({
  play: async ({ canvas }) => {
    for (const name of ['Zoom out', 'Zoom in', 'Zoom to fit']) {
      const tool = await canvas.findByRole('button', { name });

      await expect(paintedBox(tool).width).toBe(24);
      await expect(paintedBox(tool).height).toBe(24);
    }

    const reading = await canvas.findByRole('button', { name: 'Reset zoom' });

    await expect(paintedBox(reading).height).toBe(24);
  },
});

/** The reading answers the viewport it stands on, wherever the zoom came from. */
export const TheReadingFollowsTheViewport = meta.story({
  play: async ({ canvas, userEvent }) => {
    await expect(await canvas.findByText('100%')).toBeVisible();

    await userEvent.click(await canvas.findByRole('button', zoomIn));

    await waitFor(async () => {
      const reading = (await canvas.findByRole('button', { name: 'Reset zoom' })).textContent;

      await expect(reading).not.toBe('100%');
    });
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

/** Pressing the reading puts the zoom back at its true size, wherever it wandered. */
export const PressingTheReadingResetsTheZoom = meta.story({
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Zoom out' }));

    const reading = await canvas.findByRole('button', { name: 'Reset zoom' });

    await waitFor(async () => expect(reading.textContent).not.toBe('100%'));

    await userEvent.click(reading);

    await waitFor(async () => expect(reading.textContent).toBe('100%'));
  },
});

/** The cluster carries its steps, the reading, and the fit, and no lock: never frozen. */
export const TheClusterCarriesItsStepsAndTheReading = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', zoomIn)).toBeVisible();
    await expect(canvas.getAllByRole('button')).toHaveLength(4);
    await expect(canvas.queryByRole('button', { name: 'Tidy' })).toBeNull();
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
    (await canvas.findByRole('button', { name: 'Zoom out' })).focus();
    await userEvent.tab();

    const reached = await canvas.findByRole('button', { name: 'Reset zoom' });

    await waitFor(async () => expect(reached).toHaveFocus());
    await expect(paintedStyle(reached).outlineColor).toBe('rgba(0, 0, 0, 0)');
    await expect(paintedStyle(reached).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  },
});
