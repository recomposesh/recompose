import { expect, fn, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';

import { catalogEntries } from '../../../../entities/provider';
import { ProviderTile } from './provider-tile';

function entry(id: string) {
  const found = catalogEntries.find((held) => held.id === id);

  if (found === undefined) {
    throw new Error(`The catalog holds no entry called ${id}.`);
  }

  return found;
}

const meta = preview.meta({
  component: ProviderTile,
  args: {
    connected: false,
    entry: entry('anthropic'),
    onPick: fn(),
    way: 'subscription' as const,
  },
  decorators: [
    (Story) => (
      <div className="w-19 bg-surface-content p-4">
        <Story />
      </div>
    ),
  ],
});

/** A provider reads as the offer's own title, which is the product rather than the company. */
export const Subscription = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: 'Claude' })).toBeVisible();
  },
});

/** The same provider under another column reads as that column's product instead. */
export const TheSameProviderSellingAKey = meta.story({
  args: { way: 'api-key' as const },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: 'Anthropic API' })).toBeVisible();
  },
});

/** A provider offering nothing under a column draws no tile there. */
export const OfferingNothingUnderThisColumn = meta.story({
  args: { way: 'local' as const },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('button')).toBeNull();
  },
});

/** A provider already among the sources keeps its tile, because a person may want a second. */
export const AlreadyConnected = meta.story({
  args: { connected: true },
  play: async ({ args, canvas }) => {
    const tile = await canvas.findByRole('button', { name: 'Claude' });

    await userEvent.click(tile);

    await expect(args.onPick).toHaveBeenCalledOnce();
  },
});

/** A provider with no mark of its own leads with a glyph rather than an invented drawing. */
export const WithoutAMark = meta.story({
  args: { entry: entry('custom-endpoint'), way: 'api-key' as const },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: 'Custom endpoint' })).toBeVisible();
  },
});
