import { expect, fn, userEvent, waitFor } from 'storybook/test';

import preview from '#.storybook/preview';

import { paintedStyle } from '../../../../shared/testing';
import { ServedNote } from './served-note';

/** How high React Flow lifts a selected node, which the note has to clear to be seen at all. */
const CANVAS_SELECTION_LIFT = 1000;

const meta = preview.meta({
  component: ServedNote,
  args: { onDismiss: fn() },
  decorators: [
    (Story) => (
      <div className="relative h-80 w-full bg-surface-content dot-grid">
        <Story />
      </div>
    ),
  ],
});

/** The caption on the canvas the moment a first request lands. */
export const Basic = meta.story({
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('heading', { name: 'That was the whole setup' }),
    ).toBeVisible();
  },
});

/** Its one line says what to do next on the graph, which is the one thing setup never showed. */
export const ItSaysWhatToDoNext = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/Drag a cable off the gateway/u)).toBeVisible();
  },
});

/** It never repeats what the screen behind it already shows. */
export const ItNeverRestatesTheCanvas = meta.story({
  play: async ({ canvas }) => {
    await expect(canvas.queryByText(/Everything you just built is on this canvas/u)).toBeNull();
    await expect(await canvas.findAllByText(/./u)).toHaveLength(2);
  },
});

/** It stands on the canvas rather than over it, so nothing behind it goes inert. */
export const ItNeverHoldsTheWindow = meta.story({
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('dialog')).toBeNull();
    await expect(canvas.queryAllByRole('button')).toHaveLength(0);
  },
});

/** It reaches a screen reader as a standing rather than as an interruption. */
export const ItReadsAsAStanding = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('status')).toBeVisible();
  },
});

/** It carries no control, so the clock is the only way out. */
export const ItTakesItselfAway = meta.story({
  play: async ({ args }) => {
    await waitFor(async () => expect(args.onDismiss).toHaveBeenCalledOnce(), { timeout: 8000 });
  },
});

/** The clock holds while a pointer rests on it, so a line being read never leaves mid-sentence. */
export const APointerHoldsTheClock = meta.story({
  play: async ({ args, canvas }) => {
    await userEvent.hover(await canvas.findByRole('status'));
    await new Promise((settle) => {
      setTimeout(settle, 6000);
    });

    await expect(args.onDismiss).not.toHaveBeenCalled();
  },
});

/**
 * The note clears whatever the canvas raises, because the shell paints setup before the canvas.
 *
 * @summary The celebration was drawn from the root, ahead of the surface it celebrates, so the
 * canvas covered it and only the confetti above it showed. A seat of its own is what fixed it.
 */
export const ItClearsTheCanvas = meta.story({
  decorators: [
    (Story) => (
      <div className="relative h-80 w-full bg-surface-content dot-grid">
        <Story />
        <div className="absolute inset-0 z-1000 bg-surface-card" />
      </div>
    ),
  ],
  play: async ({ canvas }) => {
    const note = await canvas.findByRole('status');
    const painted = paintedStyle(note);

    await expect(painted.position).toBe('fixed');
    await expect(Number(painted.zIndex)).toBeGreaterThan(CANVAS_SELECTION_LIFT);
    await expect(note).toBeVisible();
  },
});
