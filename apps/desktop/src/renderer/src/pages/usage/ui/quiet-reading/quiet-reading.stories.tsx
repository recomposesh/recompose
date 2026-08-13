import { expect, fn, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';

import { QuietReading } from './quiet-reading';

const meta = preview.meta({
  component: QuietReading,
  args: {
    title: 'No Requests',
    sentence: 'Nothing served in the last 24 hours.',
  },
});

/** A window that served nothing, with the one way out beside it. */
export const QuietWindow = meta.story({
  args: { act: { label: 'Widen to 7 days', onPress: fn() } },
  play: async ({ args, canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Widen to 7 days' }));

    await expect(args.act?.onPress).toHaveBeenCalled();
  },
});

/** The first launch, where no window is wide enough to find traffic that never ran. */
export const NothingServedYet = meta.story({
  args: {
    title: 'No Requests Yet',
    sentence: 'Send a request through a gateway and it collects here.',
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('No Requests Yet')).toBeVisible();
    await expect(canvas.queryByRole('button')).toBeNull();
  },
});
