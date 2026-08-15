import { expect, fn } from 'storybook/test';

import preview from '#.storybook/preview';

import type { DraftModelNodeData } from './draft-model-node';

import { paintedStyle } from '../../../../shared/testing';
import { cardOnCanvas, inScheme } from '../../testing/canvas-flow.testkit';
import { DraftModelNode } from './draft-model-node';

const begun: DraftModelNodeData = {
  id: 'draft',
  kind: 'draft-model',
  modelId: 'fast-haiku',
  displayName: 'Fast Haiku',
  onPickTarget: fn(() => {}),
};

const meta = preview.meta({
  component: DraftModelNode,
  args: { data: begun, selected: false },
  render: ({ data, selected }) => cardOnCanvas('draft-model', DraftModelNode, data, selected),
});

const named = { name: /Fast Haiku/ };

/** A definition a person began and has not finished, holding its seat until it is bound. */
export const Basic = meta.story({});

/** The frame dashes in the strong line ink, so unfinished reads as unfinished at a glance. */
export const TheFrameDashesInTheStrongLineInk = meta.story({
  play: async ({ canvas }) => {
    const painted = paintedStyle(await canvas.findByRole('button', named));

    await expect(painted.borderStyle).toBe('dashed');
    await expect(painted.borderColor).toBe(
      inScheme('rgba(0, 0, 0, 0.28)', 'rgba(255, 255, 255, 0.13)'),
    );
  },
});

/** A selected draft rings in the virtual model tint, because a draft is one of those in waiting. */
export const ASelectedDraftRingsInTheModelTint = meta.story({
  args: { selected: true },
  play: async ({ canvas }) => {
    const card = await canvas.findByRole('button', named);

    await expect(paintedStyle(card).boxShadow).toContain(
      inScheme(
        'color(srgb 0.678431 0.176471 0.458824 / 0.55)',
        'color(srgb 1 0.447059 0.768627 / 0.55)',
      ),
    );
    await expect(paintedStyle(card).borderStyle).toBe('dashed');
  },
});

/** The card quietens its ink rather than dimming itself, so every line stays readable. */
export const TheCardQuietensRatherThanDims = meta.story({
  play: async ({ canvas }) => {
    const card = await canvas.findByRole('button', named);
    const quiet = inScheme('rgba(0, 0, 0, 0.56)', 'rgba(255, 255, 255, 0.58)');

    await expect(paintedStyle(card).opacity).toBe('1');
    await expect(paintedStyle(card.children[1]).color).toBe(quiet);
    await expect(paintedStyle(card.children[2]).color).toBe(quiet);
  },
});

/** A keyboard alone finishes the draft, which is the path a pointer-free person is left with. */
export const AKeyboardAloneAsksForTheTarget = meta.story({
  play: async ({ args, canvas, userEvent }) => {
    (await canvas.findByRole('button', { name: 'Pick a provider' })).focus();

    await userEvent.keyboard('{Enter}');

    await expect(args.data.onPickTarget).toHaveBeenCalledTimes(1);
  },
});

/** The outgoing port reads unbound, because nothing answers this definition yet. */
export const TheOutgoingPortReadsUnbound = meta.story({
  play: async ({ canvas, canvasElement }) => {
    await canvas.findByRole('button', named);

    const dot = canvasElement.querySelector('.react-flow__handle.source > span');

    await expect(paintedStyle(dot).backgroundColor).toBe(
      inScheme('rgb(255, 255, 255)', 'rgb(40, 40, 44)'),
    );
    await expect(paintedStyle(dot).borderColor).toBe(
      inScheme('rgba(0, 0, 0, 0.56)', 'rgba(255, 255, 255, 0.55)'),
    );
  },
});
