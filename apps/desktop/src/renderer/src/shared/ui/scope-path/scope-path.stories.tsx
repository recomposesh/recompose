import { expect, fn, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';

import { ScopePath } from '../index';

const meta = preview.meta({
  component: ScopePath,
  args: {
    rootLabel: 'All traffic',
    segments: [
      { key: 'gateway:relay', label: 'relay' },
      { key: 'virtual-model:creative', label: 'creative' },
    ],
    onTruncate: fn(),
  },
});

/** The deepest segment names the standing view, so only the wider levels take a press. */
export const AStandingScope = meta.story({
  play: async ({ canvas }) => {
    const path = await canvas.findByRole('navigation', { name: 'Scope' });

    await expect(path).toHaveTextContent('All traffic');
    await expect(canvas.getByText('creative')).toHaveAttribute('aria-current', 'page');
    await expect(canvas.queryByRole('button', { name: 'creative' })).not.toBeInTheDocument();
  },
});

/** Pressing a wider segment truncates the scope to it. */
export const TruncatedToASegment = meta.story({
  play: async ({ args, canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'relay' }));

    await expect(args.onTruncate).toHaveBeenCalledWith(1);
  },
});

/** The root segment clears every narrowing level. */
export const ClearedToTheRoot = meta.story({
  play: async ({ args, canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'All traffic' }));

    await expect(args.onTruncate).toHaveBeenCalledWith(0);
  },
});
