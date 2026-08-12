import { RadioGroup } from '@base-ui/react/radio-group';
import { expect, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';

import { MetricTile } from '../index';

const meta = preview.meta({
  component: MetricTile,
  args: {
    value: 'tokens',
    label: 'Tokens',
    reading: '45.1M',
    detail: '38% cached',
  },
  decorators: [
    (Story) => (
      <RadioGroup aria-label="Chart metric" className="flex gap-2" defaultValue="requests">
        <MetricTile label="Requests" reading="1,204" value="requests" />
        <Story />
      </RadioGroup>
    ),
  ],
});

/** A tile face carries the metric's name, its figure, and its qualifying line. */
export const AFace = meta.story({
  play: async ({ canvas }) => {
    const tile = await canvas.findByRole('radio', { name: /Tokens/ });

    await expect(tile).toHaveTextContent('45.1M');
    await expect(tile).toHaveTextContent('38% cached');
    await expect(tile).not.toBeChecked();
  },
});

/** Picking a tile moves the group's selection onto it. */
export const Picked = meta.story({
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('radio', { name: /Tokens/ }));

    await expect(await canvas.findByRole('radio', { name: /Tokens/ })).toBeChecked();
    await expect(await canvas.findByRole('radio', { name: /Requests/ })).not.toBeChecked();
  },
});
