import type { ReactNode } from 'react';

import { ReactFlowProvider } from '@xyflow/react';
import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import type { OptionGroup } from '../option-list/option-list';

import { pickerMetaArgs } from '../../testing/picker-args.testkit';
import { AnchoredPicker } from './anchored-picker';

const accounts: readonly OptionGroup[] = [
  { heading: 'API Keys', options: [{ id: 'key-work', name: 'work key', mark: 'anthropic' }] },
];

const models: readonly OptionGroup[] = [
  { options: [{ id: 'claude-sonnet-5', name: 'claude-sonnet-5' }] },
];

const seat = { x: 56, y: 32 };

function CanvasFooting({ children }: { children: ReactNode }) {
  return (
    <ReactFlowProvider>
      <div className="relative h-96 w-160 overflow-hidden bg-surface-content dot-grid">
        <div
          className="absolute flex h-22 w-46 items-center justify-center rounded-canvas-card border border-dashed border-line-strong bg-surface-card text-card-title text-ink"
          data-pending-card=""
          style={{ transform: `translate(${String(seat.x)}px, ${String(seat.y)}px)` }}
        >
          New target
        </div>
        {children}
      </div>
    </ReactFlowProvider>
  );
}

const meta = preview.meta({
  component: AnchoredPicker,
  args: { seat, ...pickerMetaArgs(accounts) },
  decorators: [
    (Story) => (
      <CanvasFooting>
        <Story />
      </CanvasFooting>
    ),
  ],
});

function stoodTogether(canvasElement: HTMLElement): { card: DOMRect; asking: DOMRect } {
  const card = canvasElement.querySelector('[data-pending-card]');
  const asking = canvasElement.querySelector('dialog');

  if (card === null || asking === null) {
    throw new Error('the pending card and its picker do not both stand');
  }

  return { card: card.getBoundingClientRect(), asking: asking.getBoundingClientRect() };
}

/** The picker hanging off the card the cable landed on, at the seat the canvas gave it. */
export const StandingOnItsCard = meta.story({
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByRole('dialog', { name: 'Pick an account' })).toBeVisible();

    const stood = stoodTogether(canvasElement);

    await expect(stood.asking.left).toBe(stood.card.left);
    await expect(stood.asking.top).toBeGreaterThanOrEqual(stood.card.bottom);
  },
});

/** The second stage stands in the same place, because one question replaced the other. */
export const TheSecondStageKeepsTheSeat = meta.story({
  args: { stage: { step: 'provider-model', accountId: 'key-work' }, groups: models },
  play: async ({ canvas, canvasElement }) => {
    await expect(
      await canvas.findByRole('dialog', { name: 'Pick a provider model' }),
    ).toBeVisible();

    const stood = stoodTogether(canvasElement);

    await expect(stood.asking.left).toBe(stood.card.left);
  },
});
