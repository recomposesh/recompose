import { expect, waitFor } from 'storybook/test';

import preview from '#.storybook/preview';

import type { CanvasFlowWiring } from './gateway-stage';

import { paintedBox, paintedStyle } from '../../../../shared/testing';
import { canvasGraph } from '../../lib/node-graph';
import { tidyPositions } from '../../lib/tidy-layout';
import { inScheme } from '../../testing/canvas-flow.testkit';
import { servingGateway, storedAccounts } from '../../testing/gateway-canvas.testkit';
import { flowEdgesOf, flowNodesOf } from '../gateway-canvas-page/canvas-wiring';
import { GatewayStage } from './gateway-stage';

const graph = canvasGraph(servingGateway, storedAccounts.accounts, {
  draft: undefined,
  pending: undefined,
});

const seats = tidyPositions(graph.nodes);

const restingFlow: CanvasFlowWiring = {
  nodes: flowNodesOf(graph, seats, undefined, {
    onAddVirtualModel: () => {},
    onBindFrom: () => {},
  }),
  edges: flowEdgesOf(graph.edges, undefined),
  onNodesChange: () => {},
  onNodeClick: () => {},
  onEdgeClick: () => {},
  onPaneClick: () => {},
  isValidConnection: () => false,
  onConnect: () => {},
  onConnectStart: () => {},
  onConnectEnd: () => {},
  onReconnect: () => {},
  onReconnectStart: () => {},
  onReconnectEnd: () => {},
  onBeforeDelete: async () => Promise.resolve(false),
  onEdgesDelete: () => {},
  onInit: () => {},
  onTidy: () => {},
  onNodeFocus: () => {},
};

const meta = preview.meta({
  component: GatewayStage,
  args: { slug: 'my-gateway', flow: restingFlow, announced: undefined },
  decorators: [
    (Story) => (
      <div className="flex h-150 bg-surface-content">
        <Story />
      </div>
    ),
  ],
});

function apart(one: DOMRect, other: DOMRect): boolean {
  return (
    one.right <= other.left ||
    other.right <= one.left ||
    one.bottom <= other.top ||
    other.bottom <= one.top
  );
}

/**
 * The assembled stage: the composition as cards and cables, with its furniture in the corners.
 *
 * @summary This is the production wiring end to end, so what it proves is that the pieces the
 * other surfaces tested one by one still agree once the stage mounts them together.
 */
export const TheComposedCanvas = meta.story({
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByRole('button', { name: /My Gateway/ })).toBeVisible();
    await expect(await canvas.findByRole('button', { name: /Fast/ })).toBeVisible();
    await expect(await canvas.findByRole('button', { name: /work/ })).toBeVisible();
    await waitFor(async () => {
      await expect(canvasElement.querySelector('[data-id="cable:fast"]')).not.toBeNull();
      await expect(canvasElement.querySelector('[data-id="cable:creative"]')).not.toBeNull();
      await expect(canvasElement.querySelector('[data-id="wire:model:fast"]')).not.toBeNull();
    });
    await expect(await canvas.findByRole('img', { name: 'Canvas map' })).toBeVisible();
    await expect(await canvas.findByLabelText('Canvas tools')).toBeVisible();
  },
});

/**
 * A wire is furniture, so the keyboard walks past it and only bindings take a stop.
 *
 * @summary Every structural wire would otherwise stand as one inert tab stop per model, and the
 * draft path would stand two under one name. A binding cable keeps its stop, because selecting it
 * is how the keyboard reads and releases a binding.
 */
export const TheKeyboardWalksPastTheWires = meta.story({
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      if (canvasElement.querySelector('[data-id="cable:fast"]') === null) {
        throw new Error('the cables have not painted yet');
      }
    });

    const wire = canvasElement.querySelector('[data-id="wire:model:fast"]');
    const cable = canvasElement.querySelector('[data-id="cable:fast"]');

    await expect(cable).toHaveAttribute('tabindex', '0');
    await expect(wire).not.toHaveAttribute('tabindex');
  },
});

/**
 * The map reads the real node types, so each card's tint survives the production wiring.
 *
 * @summary The minimap keys its tints off `node.type`, and the stage keys `nodeTypes` off each
 * card's kind. One painted tint proves the two contracts meet: a gateway card drawn teal in the
 * corner means the kind-to-type mapping held all the way through.
 */
export const TheMapKeepsTheRoleTints = meta.story({
  play: async ({ canvas }) => {
    const map = (await canvas.findByRole('img', { name: 'Canvas map' })).parentElement;
    const drawn = map?.querySelector('rect.minimap-node');

    await expect(paintedStyle(drawn).fill).toBe(
      `color(srgb ${inScheme('0.0901961 0.52549 0.607843', '0.25098 0.784314 0.878431')} / 0.85)`,
    );
  },
});

/**
 * The canvas carries no attribution and no badge of any kind between its corners.
 *
 * @summary The maintainer traded the library's courtesy badge away on 2026-08-09, as the adoption
 * record allowed. Nothing may quietly take its seat: the band between the tools cluster and the
 * map stays empty at every pane width.
 */
export const NoBadgeStandsBetweenTheCorners = meta.story({
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('link', { name: 'Built with React Flow' })).toBeNull();
    await expect(canvas.queryByText(/React Flow/)).toBeNull();
  },
});

/**
 * The zoom tools take a press at the narrowest pane the app serves.
 *
 * @summary At the 1120px window with the inspector standing, the pane narrows until the corners
 * almost meet. Every tool in the cluster must still take a press aimed at its middle, and the
 * cluster must stand apart from the map.
 */
export const TheToolsTakeAPressAtTheNarrowestPane = meta.story({
  decorators: [
    (Story) => (
      <div className="flex h-150 w-136">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas }) => {
    const fit = await canvas.findByRole('button', { name: 'Zoom to fit' });
    const tools = await canvas.findByLabelText('Canvas tools');
    const map = (await canvas.findByRole('img', { name: 'Canvas map' })).parentElement;
    const pressed = paintedBox(fit);
    const hit = fit.ownerDocument.elementFromPoint(
      pressed.left + pressed.width / 2,
      pressed.top + pressed.height / 2,
    );

    await expect(fit.contains(hit)).toBe(true);
    await expect(apart(paintedBox(tools), paintedBox(map))).toBe(true);
  },
});

/** The whole stage in the dark scheme, where the cards, cables, and furniture must all read. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
