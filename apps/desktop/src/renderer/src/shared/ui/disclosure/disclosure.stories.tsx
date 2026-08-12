import { expect, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';

import { Disclosure } from '../index';

const meta = preview.meta({
  component: Disclosure,
  args: {
    label: 'View as table',
    children: <p>Every bucket, printed.</p>,
  },
});

/** The reading stays folded away until a person asks for it. */
export const Shut = meta.story({
  play: async ({ canvas }) => {
    const trigger = await canvas.findByRole('button', { name: 'View as table' });

    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(canvas.queryByText('Every bucket, printed.')).not.toBeInTheDocument();
  },
});

/** Pressing the disclosure reveals the reading and says so to assistive tech. */
export const Opened = meta.story({
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'View as table' }));

    await expect(await canvas.findByText('Every bucket, printed.')).toBeVisible();
  },
});
