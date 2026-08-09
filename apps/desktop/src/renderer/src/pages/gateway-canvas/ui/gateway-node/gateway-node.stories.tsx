import { expect, fn } from 'storybook/test';

import preview from '#.storybook/preview';

import type { GatewayNodeData } from './gateway-node';

import { paintedStyle } from '../../../../shared/testing';
import { cardOnCanvas, inScheme } from '../../testing/canvas-flow.testkit';
import { GatewayNode } from './gateway-node';

const localGateway: GatewayNodeData = {
  id: 'gateway',
  kind: 'gateway',
  displayName: 'Local gateway',
  port: 51234,
  onAddVirtualModel: fn(() => {}),
};

const meta = preview.meta({
  component: GatewayNode,
  args: { data: localGateway, selected: false },
  render: ({ data, selected }) => cardOnCanvas('gateway', GatewayNode, data, selected),
});

const named = { name: /Local gateway/ };

/** The gateway a composition hangs off, which is the one card every canvas always carries. */
export const Basic = meta.story({});

/** The frame carries the gateway tint, so the card at the head of the flow reads as the head. */
export const TheFrameCarriesTheGatewayTint = meta.story({
  play: async ({ canvas }) => {
    const painted = paintedStyle(await canvas.findByRole('button', named));

    await expect(painted.borderColor).toBe(inScheme('rgb(23, 134, 155)', 'rgb(64, 200, 224)'));
  },
});

/** The port ask names a virtual model, the one thing a gateway is missing until it has one. */
export const ThePlusAsksForAVirtualModel = meta.story({
  play: async ({ args, canvas, userEvent }) => {
    (await canvas.findByRole('button', { name: 'Add a virtual model' })).focus();
    await userEvent.keyboard('{Enter}');

    await expect(args.data.onAddVirtualModel).toHaveBeenCalledTimes(1);
  },
});

/** Nothing arrives at the gateway, because a request starts here rather than passing through. */
export const NothingArrivesAtTheGateway = meta.story({
  play: async ({ canvas, canvasElement }) => {
    await canvas.findByRole('button', named);

    await expect(canvasElement.querySelectorAll('.react-flow__handle')).toHaveLength(1);
    await expect(canvasElement.querySelector('.react-flow__handle.target')).toBeNull();
  },
});
