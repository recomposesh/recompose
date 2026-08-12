import { expect, fn, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';

import { RangeWindowFooter } from './range-window-footer';

const NOON = new Date(2026, 7, 5, 12, 0, 0).getTime();
const DAY = 86_400_000;

const meta = preview.meta({
  component: RangeWindowFooter,
  args: {
    drafted: { from: NOON, to: NOON + 7 * DAY },
    onDraftedChange: () => {},
    zone: 'GMT+3',
    onCancel: () => {},
    onApply: () => {},
  },
  decorators: [
    (Story) => (
      <div className="w-145 rounded-card border border-line-subtle bg-surface-card">
        <Story />
      </div>
    ),
  ],
});

/** Both edges as clocks, the zone they read in, and the two acts that settle the window. */
export const BothEdges = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByLabelText('Window opens at')).toHaveValue('12:00');
    await expect(await canvas.findByText('GMT+3')).toBeVisible();
    await expect(await canvas.findByRole('button', { name: 'Apply' })).toBeVisible();
  },
});

/** Each clock moves its own edge, so a window can close at an hour it never opened at. */
export const ClosingClockMoved = meta.story({
  args: { onDraftedChange: fn() },
  play: async ({ args, canvas }) => {
    const closing = await canvas.findByLabelText('Window closes at');

    await userEvent.clear(closing);
    await userEvent.type(closing, '18:45');

    await expect(args.onDraftedChange).toHaveBeenCalled();
  },
});
