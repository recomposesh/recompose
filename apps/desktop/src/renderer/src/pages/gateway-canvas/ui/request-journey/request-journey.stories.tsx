import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { servedRequest, workKey } from '../../testing/gateway-canvas.testkit';
import { RequestJourney } from './request-journey';

const exhausted = servedRequest({
  origin: 'gateway',
  status: 502,
  provider: undefined,
  accountId: undefined,
  providerModel: undefined,
  durationMs: undefined,
  tokens: undefined,
  failure: 'The router "Failover" in the gateway "My gateway" has no child left to try.',
  diagnosis: {
    router: 'Failover',
    tried: [
      { child: 'claude-sonnet-4-5', why: 'refused with 429' },
      { child: 'gpt-5-mini', why: 'has no credential' },
    ],
  },
});

const refused = servedRequest({
  status: 429,
  failure: 'The target is turning requests away for now.',
  diagnosis: { upstreamMessage: 'You exceeded your current quota for this month.' },
});

const meta = preview.meta({
  component: RequestJourney,
  args: { account: workKey, logged: servedRequest() },
  decorators: [
    (Story) => (
      <div className="@container mx-auto my-4 flex h-70 w-200 bg-surface-card">
        <div className="min-w-0 flex-1" />
        <Story />
      </div>
    ),
  ],
});

/** A request that was served, which reads as the journey it took and names no failure. */
export const Served = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('fast')).toBeVisible();
    await expect(await canvas.findByText('claude-haiku-4-5')).toBeVisible();
    await expect(await canvas.findByText('anthropic · work')).toBeVisible();
  },
});

/** A ladder that ran out, which is the reading a person opens the drawer to find. */
export const LadderRanOut = meta.story({
  args: { account: undefined, logged: exhausted },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Failover')).toBeVisible();
    await expect(await canvas.findByText('claude-sonnet-4-5 refused with 429')).toBeVisible();
    await expect(await canvas.findByText('gpt-5-mini has no credential')).toBeVisible();
  },
});

/** A target that explained its own refusal, quoted beside the gateway's reading of it. */
export const TheProviderExplainedItself = meta.story({
  args: { logged: refused },
  play: async ({ canvas }) => {
    const reading = await canvas.findByText('The target is turning requests away for now.');

    await expect(reading).toBeVisible();
    await expect(
      await canvas.findByText('You exceeded your current quota for this month.'),
    ).toBeVisible();
  },
});

/** The panel before a person has walked the run onto anything. */
export const NothingRead = meta.story({
  args: { account: undefined, logged: undefined },
  play: async ({ canvas }) => {
    const resting = await canvas.findByText('Select a request to read what it came to.');

    await expect(resting).toBeVisible();
  },
});

/** The same reading in the dark scheme, where the quiet ink has the least room to hold up. */
export const DarkScheme = meta.story({
  args: { account: undefined, logged: exhausted },
  globals: { theme: 'dark' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('claude-sonnet-4-5 refused with 429')).toBeVisible();
  },
});
