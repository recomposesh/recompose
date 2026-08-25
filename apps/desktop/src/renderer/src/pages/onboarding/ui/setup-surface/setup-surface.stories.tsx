import { defaultSettings } from '@recompose/contracts';
import { expect, screen, userEvent, waitFor } from 'storybook/test';

import preview from '#.storybook/preview';

import { emitEngineTraffic, gatewaySeed } from '../../../../shared/testing';
import { SetupSurface } from './setup-surface';

const built = gatewaySeed({
  slug: 'my-gateway',
  displayName: 'My Gateway',
  port: 8389,
  virtualModels: [
    {
      id: 'claude-my-model',
      displayName: 'My model',
      routing: {
        entry: 'seat:claude-my-model',
        nodes: {
          'seat:claude-my-model': {
            kind: 'target',
            accountId: 'a1',
            providerModel: 'claude-opus-5',
          },
        },
      },
    },
  ],
});

const settled = { ...defaultSettings(), setupWizardSettled: true };

const fresh = { ...defaultSettings(), setupWizardSettled: false };

const meta = preview.meta({
  component: SetupSurface,
  args: { connectSheet: () => null, onBuilt: () => undefined },
  parameters: { bridge: { gateways: [], settings: fresh } },
});

/** A profile that has never settled setup meets it over the whole surface, on the welcome step. */
export const FirstSession = meta.story({
  play: async () => {
    await expect(await screen.findByRole('dialog', { name: 'Welcome to recompose' })).toBeVisible();
    await expect(await screen.findByRole('button', { name: 'Set up my gateway' })).toBeVisible();
  },
});

/** A profile that already settled setup never meets it again on its own. */
export const AlreadySettled = meta.story({
  parameters: { bridge: { gateways: [], settings: settled } },
  play: async () => {
    await expect(screen.queryByRole('dialog')).toBeNull();
  },
});

const overABuiltGateway = { bridge: { gateways: [built], settings: fresh } };

async function waitingForTheFirstRequest(): Promise<HTMLElement> {
  return screen.findByRole('dialog', { name: 'Waiting for your first request' });
}

/** A profile that built a graph and never served a request opens on the wait, not on welcome. */
export const BuiltButNeverServed = meta.story({
  parameters: overABuiltGateway,
  play: async () => {
    await expect(await waitingForTheFirstRequest()).toBeVisible();
  },
});

/** Leaving setup settles it, so the surface goes and the route underneath comes back. */
export const Exploring = meta.story({
  play: async () => {
    await userEvent.click(await screen.findByRole('button', { name: "I'll explore on my own" }));

    await waitFor(async () => {
      await expect(screen.queryByRole('dialog')).toBeNull();
    });
  },
});

/** The welcome step carries the person into the first question setup asks. */
export const SettingUp = meta.story({
  play: async () => {
    await userEvent.click(await screen.findByRole('button', { name: 'Set up my gateway' }));

    await expect(
      await screen.findByRole('dialog', { name: 'Which harnesses do you use?' }),
    ).toBeVisible();
  },
});

/** A request the gateway serves while the wait stands ends setup and brings the note out. */
export const AServedRequestEndsTheWait = meta.story({
  parameters: overABuiltGateway,
  play: async () => {
    await expect(await waitingForTheFirstRequest()).toBeVisible();

    emitEngineTraffic({
      'my-gateway': { 'claude-my-model': { 'seat:1': { outcome: 'served', at: 1200 } } },
    });

    await expect(await screen.findByText('That was the whole setup')).toBeVisible();
    await expect(await screen.findByText(/Drag a cable off the gateway/u)).toBeVisible();
    await expect(screen.queryByRole('dialog')).toBeNull();
  },
});

/** A request that only reached a target leaves the wait standing, because nothing came back. */
export const AFailedRequestLeavesTheWaitStanding = meta.story({
  parameters: overABuiltGateway,
  play: async () => {
    await expect(await waitingForTheFirstRequest()).toBeVisible();

    emitEngineTraffic({
      'my-gateway': {
        'claude-my-model': {
          'seat:1': { outcome: 'failed', at: 1200, status: 503, detail: 'no target answered' },
        },
      },
    });

    await expect(await waitingForTheFirstRequest()).toBeVisible();
  },
});
