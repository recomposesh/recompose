import { expect, screen, waitFor } from 'storybook/test';

import preview from '#.storybook/preview';

import { closeConnectSheet, openConnectSheet } from '../../../../shared/lib';
import { gatewaySeed } from '../../../../shared/testing';
import { ConnectInView } from './connect-in-view';

const myGateway = gatewaySeed({
  slug: 'my-gateway',
  displayName: 'My Gateway',
  port: 8397,
  virtualModels: [
    {
      id: 'creative',
      displayName: 'Creative',
      routing: {
        entry: 'seat:creative',
        nodes: { 'seat:creative': { kind: 'target', accountId: 'k1', providerModel: 'gpt-5' } },
      },
    },
  ],
});

const meta = preview.meta({
  component: ConnectInView,
  args: { slug: 'my-gateway' },
  parameters: { bridge: { gateways: [myGateway], engineStates: {} } },
});

/** The sheet brought out, carrying the stored gateway's own address, port and model id. */
export const BroughtOut = meta.story({
  play: async () => {
    openConnectSheet();

    const sheet = await screen.findByRole('dialog', { name: 'Connect a client to My Gateway' });

    await expect(sheet).toHaveTextContent('http://127.0.0.1:8397');
    await expect(await screen.findByText(/export ANTHROPIC_MODEL="creative"/)).toBeVisible();
  },
});

/** Putting it away hands the canvas back, which is what Done and the scrim both ask for. */
export const PutAway = meta.story({
  play: async () => {
    openConnectSheet();

    await screen.findByRole('dialog', { name: 'Connect a client to My Gateway' });

    closeConnectSheet();

    await waitFor(async () => {
      await expect(screen.queryByRole('dialog')).toBeNull();
    });
  },
});
