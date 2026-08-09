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
    onPickTargetFor: () => {},
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
  onTidy: () => {},
};

const meta = preview.meta({
  component: GatewayStage,
  args: { flow: restingFlow, announced: undefined },
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
    await expect(canvasElement.querySelector('[data-id="cable:fast"]')).not.toBeNull();
    await expect(canvasElement.querySelector('[data-id="cable:creative"]')).not.toBeNull();
    await expect(canvasElement.querySelector('[data-id="wire:model:fast"]')).not.toBeNull();
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
 * The attribution badge, restyled onto the design system and clear of both corners.
 *
 * @summary The record that adopted the library keeps its badge, so it stands as a legible chip at
 * the bottom edge rather than as the library's own wash, and it covers neither the tools cluster
 * nor the map.
 */
export const TheAttributionReadsInItsCorner = meta.story({
  play: async ({ canvas }) => {
    const badge = await canvas.findByRole('link', { name: 'Built with React Flow' });
    const tools = await canvas.findByLabelText('Canvas tools');
    const map = (await canvas.findByRole('img', { name: 'Canvas map' })).parentElement;
    const badgeBox = paintedBox(badge);

    await expect(badge).toHaveAttribute('href', 'https://reactflow.dev');
    await expect(apart(badgeBox, paintedBox(tools))).toBe(true);
    await expect(apart(badgeBox, paintedBox(map))).toBe(true);
    await expect(paintedStyle(badge).color).toBe(
      inScheme('rgba(0, 0, 0, 0.56)', 'rgba(255, 255, 255, 0.55)'),
    );
    await expect(paintedStyle(badge).backgroundColor).toBe(
      inScheme('rgba(255, 255, 255, 0.92)', 'rgba(30, 30, 33, 0.92)'),
    );
  },
});

/**
 * The Tidy tool takes a press at the narrowest pane the app serves.
 *
 * @summary At the 1120px window with the inspector standing, the pane narrows until the bottom row
 * holds no free seat between the tools cluster and the map. The badge therefore stands above that
 * row: whatever the pane width, a press aimed at Tidy lands on Tidy, and the badge still covers
 * neither corner.
 */
export const TheTidyToolTakesAPressAtTheNarrowestPane = meta.story({
  decorators: [
    (Story) => (
      <div className="flex h-150 w-136">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas }) => {
    const tidy = await canvas.findByRole('button', { name: 'Tidy' });
    const tools = await canvas.findByLabelText('Canvas tools');
    const badge = await canvas.findByRole('link', { name: 'Built with React Flow' });
    const map = (await canvas.findByRole('img', { name: 'Canvas map' })).parentElement;
    const pressed = paintedBox(tidy);
    const badgeBox = paintedBox(badge);

    await expect(
      tidy.ownerDocument.elementFromPoint(
        pressed.left + pressed.width / 2,
        pressed.top + pressed.height / 2,
      ),
    ).toBe(tidy);
    await expect(apart(badgeBox, paintedBox(tools))).toBe(true);
    await expect(apart(badgeBox, paintedBox(map))).toBe(true);
  },
});

/** The whole stage in the dark scheme, where the cards, cables, and furniture must all read. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
