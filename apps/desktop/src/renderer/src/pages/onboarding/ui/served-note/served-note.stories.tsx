import { expect, fn, userEvent } from 'storybook/test';

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

/** It stands on the canvas rather than over it, so nothing behind it goes inert. */
export const ItNeverHoldsTheWindow = meta.story({
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('dialog')).toBeNull();
  },
});

/** A person puts it away, and nothing else does. */
export const Dismissing = meta.story({
  play: async ({ args, canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Got it' }));

    await expect(args.onDismiss).toHaveBeenCalledOnce();
  },
});
