import type { UsageReport } from '@recompose/contracts';

import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { servingBridgeWorld, servingGateway } from '../../testing/gateway-canvas.testkit';
import { framedAsDrawerBox } from '../../testing/subject-shell.testkit';
import { GatewayGeneralInfo } from './gateway-general-info';

const HOUR_MS = 3_600_000;
const NOW_HOUR = Date.now() - (Date.now() % HOUR_MS);

const servedDay: UsageReport = {
  range: '24h',
  bucketWidth: 'hour',
  buckets: [
    {
      start: NOW_HOUR - HOUR_MS,
      tuple: { gateway: 'my-gateway' },
      measures: {
        requests: 42,
        failed: 0,
        answered: 42,
        durationMsSum: 21_000,
        tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0, total: 900 },
      },
    },
  ],
  dayCosts: [],
  priceMisses: [],
  pricing: { source: 'bundled' },
};

const meta = preview.meta({
  component: GatewayGeneralInfo,
  args: { gateway: servingGateway },
  decorators: [framedAsDrawerBox],
  parameters: { bridge: servingBridgeWorld },
});

/** A served day summarizes under the facts and links into the pre-filtered explorer. */
export const WithAServedDay = meta.story({
  parameters: { bridge: { ...servingBridgeWorld, usageReport: servedDay } },
  play: async ({ canvas }) => {
    const summary = await canvas.findByRole('link', { name: /42 requests/ });

    await expect(summary).toBeVisible();
    await expect(summary).toHaveAttribute('href', expect.stringContaining('gateway=my-gateway'));
  },
});

/** The gateway facts at rest, with Edit as the one way in. */
export const TheGatewayFactsAtRest = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('My Gateway')).toBeVisible();
    await expect(await canvas.findByRole('button', { name: 'Edit' })).toBeVisible();
  },
});

/** Edit opens the name for rewriting, seeded with the stored display name. */
export const EditingTheName = meta.story({
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Edit' }));

    await expect(await canvas.findByRole('textbox', { name: 'Gateway name' })).toHaveValue(
      'My Gateway',
    );
    await expect(await canvas.findByRole('button', { name: 'Save' })).toBeVisible();
  },
});
