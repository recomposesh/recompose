import { expect, userEvent, waitFor } from 'storybook/test';

import preview from '#.storybook/preview';

import { HoverReading } from '../index';

const meta = preview.meta({
  component: HoverReading,
  args: {
    reading: <span>1,204 input tokens</span>,
    children: <span className="inline-block h-8 w-4 bg-series-input">​</span>,
  },
});

/** Resting, the reading stays out of the way and out of the tree. */
export const Resting = meta.story({
  play: async ({ canvas }) => {
    await expect(canvas.queryByText('1,204 input tokens')).not.toBeInTheDocument();
  },
});

/** Hovering the mark brings the printed reading up beside it. */
export const Hovered = meta.story({
  play: async ({ canvas }) => {
    await userEvent.hover(await canvas.findByTestId('hover-reading-trigger'));

    await waitFor(async () => {
      await expect(document.body).toHaveTextContent('1,204 input tokens');
    });
  },
});
