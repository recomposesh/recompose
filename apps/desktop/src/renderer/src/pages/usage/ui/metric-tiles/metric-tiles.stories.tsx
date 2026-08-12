import type { ComponentProps } from 'react';

import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { MetricTiles } from './metric-tiles';

const faces: ComponentProps<typeof MetricTiles>['faces'] = {
  requests: { reading: '1,204' },
  errors: { reading: '3' },
  latency: { reading: '840ms', detail: 'average' },
  tokens: { reading: '45.1M', detail: '38% cached' },
  spend: { reading: '$1.92', detail: 'today so far' },
};

const meta = preview.meta({
  component: MetricTiles,
});

/** Five faces headline the window, and the checked one names what the chart draws. */
export const FiveFaces = meta.story({
  render: () => <MetricTiles faces={faces} metric="tokens" onMetricChange={() => {}} />,
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('radio', { name: /Tokens/ })).toBeChecked();
    await expect(await canvas.findByText('38% cached')).toBeVisible();
  },
});
