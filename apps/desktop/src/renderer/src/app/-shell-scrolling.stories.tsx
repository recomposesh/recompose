import { RouterProvider, useRouter } from '@tanstack/react-router';
import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import {
  judgedWorld,
  servedAcrossTwoModels,
  servingBridgeWorld,
} from '../pages/gateway-canvas/testing';
import { inspectorOpen, logsDrawerOpen, toggleInspector, toggleLogsDrawer } from '../shared/lib';
import { emitEngineLogs, paintedBox, paintedStyle } from '../shared/testing';

const WINDOW = { height: 900, width: 1440 };

const A_SHORT_WINDOW = { height: 460, width: 1024 };

const A_WHEEL_BURST = 8;

const A_HAIRS_BREADTH = 1.5;

function AppWindow() {
  const router = useRouter();

  return (
    <div className="overflow-hidden bg-surface-content" style={WINDOW}>
      <RouterProvider router={router} />
    </div>
  );
}

function ShortAppWindow() {
  const router = useRouter();

  return (
    <div className="overflow-hidden bg-surface-content" style={A_SHORT_WINDOW}>
      <RouterProvider router={router} />
    </div>
  );
}

function openEveryDrawer(): () => void {
  if (!inspectorOpen()) {
    toggleInspector();
  }

  if (!logsDrawerOpen()) {
    toggleLogsDrawer();
  }

  return () => {
    if (inspectorOpen()) {
      toggleInspector();
    }

    if (logsDrawerOpen()) {
      toggleLogsDrawer();
    }
  };
}

const meta = preview.meta({
  component: AppWindow,
  parameters: { bridge: servingBridgeWorld, route: '/gateways/my-gateway' },
});

/**
 * Rolls the wheel down over one spot, the way a trackpad flick does, notch after notch.
 *
 * @operation The events are dispatched rather than driven through the pointer because the question
 * is what the page does with a wheel that reaches it, not whether a pointer could have got there.
 */
function wheeledDownOver(element: Element): void {
  for (let notch = 0; notch < A_WHEEL_BURST; notch += 1) {
    element.dispatchEvent(
      new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 240 }),
    );
  }
}

/** Every box between one element and the window, which is where a stray scroll shows up. */
function boxesAbove(element: Element, root: Element): Element[] {
  const held: Element[] = [];

  for (let at = element.parentElement; at !== null && root.contains(at); at = at.parentElement) {
    held.push(at);
  }

  return held;
}

function scrolledAbove(element: Element, root: Element): number {
  return Math.max(0, ...boxesAbove(element, root).map((box) => box.scrollTop));
}

/**
 * The reading every scenario here makes: a wheel burst lands, and the strip has not moved.
 *
 * @summary Both halves matter and neither implies the other. Nothing between the strip and the
 * window may have scrolled, and the strip must still sit on the window's floor, because a shell
 * that grew past its box detaches the strip without any scroller having to move at all.
 */
async function theStripHoldsTheFloor(canvasElement: HTMLElement): Promise<void> {
  const strip = canvasElement.querySelector('main footer');
  const window = canvasElement.firstElementChild;

  wheeledDownOver(canvasElement.querySelector('.react-flow__pane') ?? canvasElement);

  await expect(scrolledAbove(strip ?? canvasElement, canvasElement)).toBe(0);
  await expect(Math.abs(paintedBox(strip).bottom - paintedBox(window).bottom)).toBeLessThan(
    A_HAIRS_BREADTH,
  );
}

/** The band the shell gives a route, which is the only box between a page and the window. */
function surfaceBand(canvasElement: HTMLElement): Element | null {
  return canvasElement.querySelector('main')?.lastElementChild ?? null;
}

/**
 * The canvas route hands the shell no scroller at all, so no overflow it grows can move the window.
 *
 * @summary The canvas owns its wheel: it pans and zooms itself, and it sizes itself to the box the
 * shell gives it. A scroller above it can therefore only ever be a bug, and the bug it makes is the
 * worst kind of layout bug to read: the traffic strip slides up off the window's floor and an empty
 * band opens under it, which says the app came apart rather than that a page scrolled.
 */
export const TheCanvasRouteHandsTheShellNoScroller = meta.story({
  play: async ({ canvas, canvasElement }) => {
    await canvas.findByText(/req\/min/u);

    await expect(paintedStyle(surfaceBand(canvasElement)).overflowY).toBe('hidden');
  },
});

/** A route that reads as a document keeps its band, since a document is sized by its content. */
export const ADocumentRouteKeepsItsScroller = meta.story({
  parameters: { bridge: servingBridgeWorld, route: '/settings' },
  play: async ({ canvas, canvasElement }) => {
    await canvas.findByRole('heading', { level: 1, name: 'Settings' });

    await expect(paintedStyle(surfaceBand(canvasElement)).overflowY).toBe('auto');
  },
});

/** A wheel burst over the canvas moves nothing the shell owns. */
export const AWheelOverTheCanvasScrollsNothing = meta.story({
  play: async ({ canvas, canvasElement }) => {
    await canvas.findByText(/req\/min/u);

    await theStripHoldsTheFloor(canvasElement);
  },
});

/**
 * The same window with both drawers standing and a log to fill one.
 *
 * @summary The logs drawer reaches most of the window, so this is the state where a column that
 * could outgrow its box would, and where a shell that could scroll would start.
 */
export const TheStripKeepsTheFloorUnderEveryDrawer = meta.story({
  beforeEach: openEveryDrawer,
  play: async ({ canvas, canvasElement }) => {
    emitEngineLogs({ kind: 'backfill', rows: servedAcrossTwoModels });

    await canvas.findByText(/req\/min/u);

    await theStripHoldsTheFloor(canvasElement);
  },
});

/**
 * The judge inspector standing open, which is the tallest panel this app has.
 *
 * @summary Its classification prompt is a ten-row field. A panel that reached past the window
 * would be the one thing able to push the shell past its own box, so it scrolls inside itself
 * rather than growing, and nothing above it scrolls to make room.
 */
export const TheJudgePanelStaysInsideTheWindow = meta.story({
  parameters: { bridge: judgedWorld, route: '/gateways/my-gateway' },
  beforeEach: openEveryDrawer,
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Judge' }));

    const panel = await canvas.findByRole('complementary', { name: 'Inspector' });
    const floor = paintedBox(canvasElement.firstElementChild).bottom;

    await expect(paintedBox(panel).bottom).toBeLessThanOrEqual(floor + A_HAIRS_BREADTH);
    await expect(scrolledAbove(panel, canvasElement)).toBe(0);
  },
});

/**
 * A window short enough that the drawers have to fight the canvas for room.
 *
 * @summary A panel sized against the viewport rather than against its column is what pushes a shell
 * past its own box, and a short window is where that first shows.
 */
export const TheStripKeepsTheFloorInAShortWindow = meta.story({
  parameters: { bridge: judgedWorld, route: '/gateways/my-gateway' },
  beforeEach: openEveryDrawer,
  render: () => <ShortAppWindow />,
  play: async ({ canvas, canvasElement, userEvent }) => {
    emitEngineLogs({ kind: 'backfill', rows: servedAcrossTwoModels });
    await userEvent.click(await canvas.findByRole('button', { name: 'Judge' }));
    await canvas.findByRole('textbox', { name: 'Classification prompt' });

    await theStripHoldsTheFloor(canvasElement);
  },
});

/**
 * A wheel over the strip itself scrolls nothing either.
 *
 * @summary The canvas swallows its own wheel, so a burst that lands on the furniture around it is
 * the one that would reach a shell scroller if the shell had kept one.
 */
export const AWheelOverTheStripScrollsNothing = meta.story({
  play: async ({ canvas, canvasElement }) => {
    const strip = await canvas.findByText(/req\/min/u);

    wheeledDownOver(strip);

    await expect(scrolledAbove(strip, canvasElement)).toBe(0);
  },
});
