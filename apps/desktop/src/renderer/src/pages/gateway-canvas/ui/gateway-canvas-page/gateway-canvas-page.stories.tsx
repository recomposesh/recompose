import { expect, waitFor } from 'storybook/test';

import preview from '#.storybook/preview';
import { withShellSurface } from '#.storybook/shell-surface';

import { inspectorOpen, toggleInspector } from '../../../../shared/lib';
import { dropCanvasPositions } from '../../lib/canvas-position-store';
import { leaveDrafting } from '../../lib/use-held-draft';
import { servingBridgeWorld } from '../../testing/gateway-canvas.testkit';
import { GatewayCanvasPage } from './gateway-canvas-page';

function freshCanvas() {
  dropCanvasPositions('my-gateway');
  leaveDrafting('my-gateway');

  if (!inspectorOpen()) {
    toggleInspector();
  }
}

const meta = preview.meta({
  component: GatewayCanvasPage,
  args: { slug: 'my-gateway' },
  beforeEach: () => {
    freshCanvas();

    return freshCanvas;
  },
  decorators: [withShellSurface],
  parameters: { bridge: servingBridgeWorld },
});

/**
 * The gateway surface: the composition standing as a canvas, beside the inspector reading it.
 *
 * @summary The canvas draws engine truth and the drawer reads whatever stands selected, which is
 * the gateway itself until a person points at something.
 */
export const Serving = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: /My Gateway/ })).toBeVisible();
    await expect(await canvas.findByRole('button', { name: /Fast/ })).toBeVisible();
    await expect(await canvas.findByText('fast → work · claude-haiku-4-5')).toBeVisible();
  },
});

/** The gateway plus births a draft card, and the inspector turns onto its fields. */
export const DraftingAModel = meta.story({
  play: async ({ canvas, userEvent }) => {
    (await canvas.findByLabelText('Add a virtual model')).focus();
    await userEvent.keyboard('{Enter}');

    await expect(
      await canvas.findByRole('button', { name: /Unnamed virtual model/ }),
    ).toBeVisible();
    await expect(await canvas.findByRole('textbox', { name: 'Name' })).toBeVisible();
  },
});

/** A selected cable turns the inspector onto the binding it stands for. */
export const ReadingACable = meta.story({
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByRole('button', { name: /My Gateway/ })).toBeVisible();

    canvasElement
      .querySelector('[data-id="cable:fast"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    await expect(await canvas.findByText('Binding', { exact: true })).toBeVisible();
    await expect(await canvas.findByText('claude-haiku-4-5', { exact: true })).toBeVisible();
  },
});

/**
 * A pane press lets the selection go and hands the canvas the whole width.
 *
 * @summary The inspector is something a person opens by pointing at a subject, so the screen has
 * to read as finished without it rather than as a panel that failed to load.
 */
export const InspectorClosed = meta.story({
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByRole('button', { name: /My Gateway/ })).toBeVisible();

    canvasElement
      .querySelector('.react-flow__pane')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    await waitFor(async () => {
      await expect(canvas.queryByText('Endpoint')).toBeNull();
    });
    await expect(await canvas.findByRole('button', { name: /My Gateway/ })).toBeVisible();
  },
});

/** The whole surface in the dark scheme, where the canvas has to separate from the drawer. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
