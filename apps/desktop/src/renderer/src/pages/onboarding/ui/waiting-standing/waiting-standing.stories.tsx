import { defaultSettings } from '@recompose/contracts';
import { expect, fn, screen } from 'storybook/test';

import preview from '#.storybook/preview';

import { gatewaySeed } from '../../../../shared/testing';
import { onAStepSurface } from '../../testing/on-a-surface';
import { WaitingStanding } from './waiting-standing';

const fresh = { ...defaultSettings(), setupWizardSettled: false };

const built = gatewaySeed({ slug: 'my-gateway', displayName: 'My Gateway', port: 8389 });

const meta = preview.meta({
  component: WaitingStanding,
  args: {
    gateway: built,
    harnesses: new Set(['claude-code']),
    onShowCommands: fn(),
    onSkip: fn(),
  },
  parameters: { bridge: { gateways: [built], settings: fresh } },
  decorators: [onAStepSurface],
});

/** The wait names the address a harness sends to, read off the gateway setup built. */
export const OverABuiltGateway = meta.story({
  play: async () => {
    await expect((await screen.findAllByText(/127\.0\.0\.1:8389/u)).length).toBeGreaterThan(0);
  },
});

/** A person who reached the wait without a built gateway is shown no address at all. */
export const WithNoGatewayBuilt = meta.story({
  args: { gateway: undefined },
  play: async () => {
    await expect(screen.queryByText(/127\.0\.0\.1:8389/u)).toBeNull();
  },
});

/** The way back to the commands stands, because a person who lost them has nowhere else to look. */
export const TheCommandsStayReachable = meta.story({
  play: async () => {
    await expect(await screen.findByRole('button', { name: /command/iu })).toBeVisible();
  },
});
