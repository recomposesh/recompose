import { expect, fn, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';

import { paintedBox, paintedStyle } from '../../../../shared/testing';
import { onAStepSurface } from '../../testing/on-a-surface';
import { SetupStepFrame } from './setup-step-frame';

/** How tall the window's chrome band runs, which the surface paints its own drag strip across. */
const BAND = 54;

const meta = preview.meta({
  component: SetupStepFrame,
  args: {
    acts: <button type="button">Continue</button>,
    children: <div className="h-40 rounded-card bg-surface-card" />,
    lede: 'Pick every harness you work with. They share one gateway and use it the same way.',
    onSkip: fn(),
    step: 'harnesses' as const,
  },
  decorators: [onAStepSurface],
});

/** The shape every step past the welcome shares: the beats, the heading, the lede, the acts. */
export const Basic = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('list', { name: 'Setup progress' })).toBeVisible();
    await expect(
      await canvas.findByRole('img', { name: 'Which harnesses do you use?' }),
    ).toBeVisible();
    await expect(await canvas.findByRole('button', { name: 'Continue' })).toBeVisible();
  },
});

/** The way out sits in the corner, not in the act row, because leaving is not one of the choices. */
export const SkippingLeavesSetup = meta.story({
  play: async ({ args, canvas }) => {
    const skip = await canvas.findByRole('button', { name: 'Skip setup' });

    await expect(paintedBox(skip).left).toBeGreaterThan(
      paintedBox(await canvas.findByRole('button', { name: 'Continue' })).right,
    );

    await userEvent.click(skip);

    await expect(args.onSkip).toHaveBeenCalledOnce();
  },
});

/** The way out rides the chrome band, and clears the drag under it so the press lands. */
export const SkippingRidesTheChromeBand = meta.story({
  play: async ({ canvas }) => {
    const skip = await canvas.findByRole('button', { name: 'Skip setup' });

    await expect(paintedBox(skip).bottom).toBeLessThan(BAND);
    await expect(paintedStyle(skip).getPropertyValue('-webkit-app-region')).toBe('no-drag');
    await expect(
      paintedBox(await canvas.findByRole('list', { name: 'Setup progress' })).top,
    ).toBeGreaterThan(BAND);
  },
});

/** A step taller than the window scrolls its content, never its acts. */
export const ATallStepKeepsItsActs = meta.story({
  args: { children: <div className="h-250 rounded-card bg-surface-card" /> },
  play: async ({ canvas, canvasElement }) => {
    const acts = await canvas.findByRole('button', { name: 'Continue' });

    await expect(paintedBox(acts).bottom).toBeLessThanOrEqual(paintedBox(canvasElement).bottom);
    await expect(acts).toBeVisible();
  },
});
