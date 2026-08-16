import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';

import type { BridgeParameters } from '../../../../shared/testing';

import { closeConnectSheet, openConnectSheet } from '../../../../shared/lib';
import { gatewaySeed, installFakeBridge } from '../../../../shared/testing';
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

async function standing(slug: string, parameters: BridgeParameters = { gateways: [myGateway] }) {
  installFakeBridge(parameters);

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  await render(
    <QueryClientProvider client={queryClient}>
      <ConnectInView slug={slug} />
    </QueryClientProvider>,
  );
}

test('the sheet carries the stored gateway address, port and model into every block', async () => {
  closeConnectSheet();
  await standing('my-gateway');

  openConnectSheet();

  await expect
    .element(page.getByRole('dialog', { name: 'Connect a client to My Gateway' }))
    .toBeVisible();
  await expect
    .element(page.getByText('export ANTHROPIC_BASE_URL="http://127.0.0.1:8397"'))
    .toBeVisible();
  await expect.element(page.getByText('export ANTHROPIC_MODEL="creative"')).toBeVisible();

  closeConnectSheet();
});

test('a slug no gateway is stored under draws nothing, rather than a sheet with no facts', async () => {
  closeConnectSheet();
  await standing('nothing-here');

  openConnectSheet();

  await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();

  closeConnectSheet();
});

test('putting the sheet away hands the canvas back', async () => {
  closeConnectSheet();
  await standing('my-gateway');

  openConnectSheet();

  await expect.element(page.getByRole('dialog')).toBeVisible();

  closeConnectSheet();

  await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
});
