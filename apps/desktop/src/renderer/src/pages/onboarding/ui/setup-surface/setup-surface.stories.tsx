import { defaultSettings } from '@recompose/contracts';
import { expect, screen, userEvent, waitFor } from 'storybook/test';

import preview from '#.storybook/preview';

import { gatewaySeed } from '../../../../shared/testing';
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

/** A profile that built a graph and never served a request opens on the wait, not on welcome. */
export const BuiltButNeverServed = meta.story({
  parameters: { bridge: { gateways: [built], settings: fresh } },
  play: async () => {
    await expect(
      await screen.findByRole('dialog', { name: 'Waiting for your first request' }),
    ).toBeVisible();
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
