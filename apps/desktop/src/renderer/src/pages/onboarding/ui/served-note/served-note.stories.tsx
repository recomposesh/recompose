import { expect, fn, userEvent, waitFor } from 'storybook/test';

import preview from '#.storybook/preview';

import { ServedNote } from './served-note';

const meta = preview.meta({
  component: ServedNote,
  args: { harness: 'Claude Code', onDismiss: fn() },
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
    await expect(
      await canvas.findByText(/Claude Code asked, and your plan answered/u),
    ).toBeVisible();
  },
});

/** Setup cannot tell which harness sent the request, so naming none is honest too. */
export const WithoutANamedHarness = meta.story({
  args: { harness: undefined },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText(/Everything you just built is on this canvas/u),
    ).toBeVisible();
    await expect(canvas.queryByText(/asked, and your plan answered/u)).toBeNull();
  },
});

/** The last line says what to do next on the graph, which is the one thing setup never showed. */
export const ItSaysWhatToDoNext = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/Drag a cable off the gateway/u)).toBeVisible();
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
