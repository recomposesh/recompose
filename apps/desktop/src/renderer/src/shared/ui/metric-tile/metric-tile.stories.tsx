import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { MetricTile } from '../index';

const meta = preview.meta({
  component: MetricTile,
  args: {
    label: 'Tokens',
    reading: '45.1M',
    detail: '38% cached',
  },
  decorators: [
    (Story) => (
      <div className="flex gap-3">
        <MetricTile detail="+12% vs prev 24h" label="Requests" reading="1,204" />
        <Story />
      </div>
    ),
  ],
});

/** A tile face carries the metric's name, its figure, and its qualifying line. */
export const AFace = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('45.1M')).toBeVisible();
    await expect(await canvas.findByText('38% cached')).toBeVisible();
  },
});

/** A figure with nothing to qualify it stands alone. */
export const FigureAlone = meta.story({
  args: { detail: undefined },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('45.1M')).toBeVisible();
  },
});
