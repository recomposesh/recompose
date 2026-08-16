import { expect, fn } from 'storybook/test';

import preview from '#.storybook/preview';

import type { VirtualModelNodeData } from './virtual-model-node';

import { paintedStyle, pressedByKeyboard } from '../../../../shared/testing';
import { cardOnCanvas, inScheme } from '../../testing/canvas-flow.testkit';
import { VirtualModelNode } from './virtual-model-node';

const sonnet: VirtualModelNodeData = {
  id: 'model:sonnet-latest',
  kind: 'virtual-model',
  modelId: 'sonnet-latest',
  displayName: 'Everyday Sonnet',
  providerModel: 'claude-sonnet-4',
  onPickTarget: fn(() => {}),
};

const meta = preview.meta({
  component: VirtualModelNode,
  args: { data: sonnet, selected: false },
  render: ({ data, selected }) => cardOnCanvas('virtual-model', VirtualModelNode, data, selected),
});

const named = { name: /Everyday Sonnet/ };

/** The alias a client asks for, standing between the gateway and whatever answers it. */
export const Basic = meta.story({});

/** The frame carries the virtual model tint, which is the middle column's own color. */
export const TheFrameCarriesTheVirtualModelTint = meta.story({
  play: async ({ canvas }) => {
    const painted = paintedStyle(await canvas.findByRole('button', named));

    await expect(painted.borderColor).toBe(inScheme('rgb(173, 45, 117)', 'rgb(255, 114, 196)'));
  },
});

/** The port ask names the target this definition answers with, which is the keyboard path. */
export const TheAskNamesATarget = meta.story({
  play: async ({ args, canvas, userEvent }) => {
    await pressedByKeyboard(
      canvas,
      { role: 'button', name: 'Pick a target' },
      userEvent.keyboard,
      '{Enter}',
    );

    await expect(args.data.onPickTarget).toHaveBeenCalledTimes(1);
  },
});

/** The line under the name is the id a client sends, which is the one string worth copying. */
export const TheSubtitleIsTheIdAClientSends = meta.story({
  play: async ({ canvas }) => {
    const card = await canvas.findByRole('button', named);

    await expect(card.children[2]).toHaveTextContent('sonnet-latest');
  },
});
