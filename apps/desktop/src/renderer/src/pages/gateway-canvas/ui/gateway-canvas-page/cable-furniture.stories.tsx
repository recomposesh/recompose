import { expect } from 'storybook/test';

import preview from '#.storybook/preview';
import { withShellSurface } from '#.storybook/shell-surface';

import { inspectorOpen, toggleInspector } from '../../../../shared/lib';
import { paintedCentre } from '../../../../shared/testing';
import { dropCanvasViewport } from '../../lib/canvas-viewport-store';
import { branchPillOn, sagOffEveryCable } from '../../testing/cable-geometry.testkit';
import { forgetCanvasArrangement } from '../../testing/canvas-story.testkit';
import { judgedWorld } from '../../testing/routed-gateways.testkit';
import { GatewayCanvasPage } from './gateway-canvas-page';

const A_HAIRS_BREADTH = 1.5;

function judgedCanvasFresh() {
  forgetCanvasArrangement('my-gateway');
  dropCanvasViewport('my-gateway');

  if (inspectorOpen()) {
    toggleInspector();
  }
}

const meta = preview.meta({
  component: GatewayCanvasPage,
  args: { slug: 'my-gateway' },
  beforeEach: () => {
    judgedCanvasFresh();

    return judgedCanvasFresh;
  },
  decorators: [withShellSurface],
  parameters: { bridge: judgedWorld },
});

/** The else pill rides its own cable, centered across the stroke rather than hanging off it. */
export const TheElsePillRidesItsCable = meta.story({
  play: async ({ canvasElement }) => {
    const pill = paintedCentre(branchPillOn(canvasElement, 'Else'));

    await expect(sagOffEveryCable(pill, canvasElement)).toBeLessThan(A_HAIRS_BREADTH);
  },
});

/**
 * The same pill once a person selects the card the cable arrives at, which must move nothing.
 *
 * @summary Picking a card is the commonest thing anyone does on this canvas. A label that sagged
 * off its line every time would read as the cable having moved rather than the card having been
 * chosen, and the branch would look like it named the empty space under the wire.
 */
export const TheElsePillHoldsItsLineWhileItsCardIsChosen = meta.story({
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: /gpt-5/ }));

    const pill = paintedCentre(branchPillOn(canvasElement, 'Else'));

    await expect(sagOffEveryCable(pill, canvasElement)).toBeLessThan(A_HAIRS_BREADTH);
  },
});

/** The same pill once the router the cable leaves is the card standing selected. */
export const TheElsePillHoldsItsLineWhileTheRouterIsChosen = meta.story({
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: /Conditional/ }));

    const pill = paintedCentre(branchPillOn(canvasElement, 'Else'));

    await expect(sagOffEveryCable(pill, canvasElement)).toBeLessThan(A_HAIRS_BREADTH);
  },
});

/** The worded branch keeps its line under the same selection, since both pills ride alike. */
export const TheBranchPillHoldsItsLineWhileItsCardIsChosen = meta.story({
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: /claude-haiku/ }));

    const pill = paintedCentre(branchPillOn(canvasElement, 'code'));

    await expect(sagOffEveryCable(pill, canvasElement)).toBeLessThan(A_HAIRS_BREADTH);
  },
});

/** The judged pane in the dark scheme, where the pill has to keep its edge against the line. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
