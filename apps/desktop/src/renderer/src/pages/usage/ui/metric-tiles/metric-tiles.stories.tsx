import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import type { MetricFaces } from '../../lib/usage-faces';

import { MetricTiles } from './metric-tiles';

const faces: MetricFaces = {
  requests: { reading: '12,480', detail: '+12% vs prev 24h' },
  errors: { reading: '96', detail: '0.8% of requests' },
  latency: { reading: '640ms', detail: 'average' },
  tokens: { reading: '18.4M', detail: '41% cached' },
  spend: { reading: '$41.20', detail: '≈$12.90 equivalent' },
};

const meta = preview.meta({
  component: MetricTiles,
  args: { faces },
});

/** Five readings headline the window, each with the line qualifying it. */
export const FiveFaces = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('+12% vs prev 24h')).toBeVisible();
    await expect(await canvas.findByText('41% cached')).toBeVisible();
  },
});

/** A window that served nothing reads as missing rather than as zero. */
export const NothingYet = meta.story({
  args: {
    faces: {
      requests: { reading: '—' },
      errors: { reading: '—' },
      latency: { reading: '—', detail: 'average' },
      tokens: { reading: '—' },
      spend: { reading: '—' },
    },
  },
});
