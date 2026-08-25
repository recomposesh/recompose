import { expect, fn, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';

import { connectClients, connectGroups } from '../../../../entities/harness';
import { onAStepSurface } from '../../testing/on-a-surface';
import { HarnessStep } from './harness-step';

const meta = preview.meta({
  component: HarnessStep,
  args: {
    onBack: fn(),
    onContinue: fn(),
    onSkip: fn(),
    onToggle: fn(),
    picked: new Set<string>(),
  },
  decorators: [onAStepSurface],
});

/** The whole connect catalog, under the catalog's own headings and in its own order. */
export const Untouched = meta.story({
  play: async ({ canvas, canvasElement }) => {
    for (const group of connectGroups) {
      await expect(await canvas.findByRole('heading', { name: group.title })).toBeVisible();
    }

    await expect(canvasElement.querySelectorAll('[aria-pressed]')).toHaveLength(
      connectClients.length,
    );
  },
});

/** Nothing picked leaves the control that continues refusing. */
export const NothingPicked = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: 'Continue' })).toBeDisabled();
  },
});

/** Two picked, and the control that continues counts them. */
export const TwoPicked = meta.story({
  args: { picked: new Set(['claude-code', 'cursor']) },
  play: async ({ canvas }) => {
    const carryOn = await canvas.findByRole('button', { name: 'Continue with 2 harnesses' });

    await expect(carryOn).toBeEnabled();
    await expect(await canvas.findByRole('button', { name: /Claude Code/u })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  },
});

/** One picked reads in the singular. */
export const OnePicked = meta.story({
  args: { picked: new Set(['claude-code']) },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('button', { name: 'Continue with 1 harness' }),
    ).toBeEnabled();
  },
});

/** Picking a harness reports which one, so the caller never has to guess from a count. */
export const PickingReportsWhich = meta.story({
  play: async ({ args, canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: /Codex CLI/u }));

    await expect(args.onToggle).toHaveBeenCalledWith('codex-cli');
  },
});
