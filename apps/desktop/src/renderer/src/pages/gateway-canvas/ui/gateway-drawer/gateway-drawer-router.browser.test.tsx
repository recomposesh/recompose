import type { GatewayConfig } from '@recompose/contracts';

import { expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import { gatewaySeed, installFakeBridge } from '../../../../shared/testing';
import { listedModels, storedAccounts } from '../../testing/gateway-canvas.testkit';
import { renderDrawer } from '../../testing/gateway-drawer.testkit';
import {
  nestedGateway,
  oneProviderPool,
  twoKeysOneProvider,
} from '../../testing/routed-gateways.testkit';

vi.setConfig({ testTimeout: 40_000 });

function refusingEveryRewrite(gateway: GatewayConfig): void {
  installFakeBridge({
    accounts: storedAccounts,
    gateways: [gateway],
    providerModels: listedModels,
    overrides: {
      'gateways:update': async () =>
        Promise.resolve({
          ok: false,
          error: { code: 'storage-failed', message: 'the gateway file could not be written' },
        }),
    },
  });
}

function pooledGateway(mode: 'failover' | 'round-robin'): GatewayConfig {
  return gatewaySeed({
    slug: 'my-gateway',
    displayName: 'My Gateway',
    port: 8397,
    virtualModels: [
      {
        id: 'pooled',
        displayName: 'Pooled',
        routing: {
          entry: 'r1',
          nodes: {
            r1: { kind: 'router', policy: { mode }, children: ['t1', 't2'] },
            t1: { kind: 'target', accountId: 'k1', providerModel: 'claude-haiku-4-5' },
            t2: { kind: 'target', accountId: 'g1', providerModel: 'openai/gpt-5' },
          },
        },
      },
    ],
  });
}

const onTheRouter = { kind: 'router', modelId: 'pooled', routeNodeId: undefined } as const;

test('the router subject reads as the router it is, headed by its kind', async () => {
  const screen = await renderDrawer(onTheRouter, { gateway: pooledGateway('failover') });

  await expect.element(screen.getByText('Router', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('Failover', { exact: true }).first()).toBeVisible();
});

test('the mode stands as the two segments a person chooses between', async () => {
  const screen = await renderDrawer(onTheRouter, { gateway: pooledGateway('failover') });
  const mode = screen.getByRole('radiogroup', { name: 'Routing mode' });

  await expect.element(mode).toBeVisible();
  await expect.element(screen.getByRole('radio', { name: 'Failover' })).toBeChecked();
  await expect.element(screen.getByRole('radio', { name: 'Round-robin' })).not.toBeChecked();
});

test('the sentence above the list says which end wins under failover', async () => {
  const screen = await renderDrawer(onTheRouter, { gateway: pooledGateway('failover') });

  await expect.element(screen.getByText(/topmost healthy target/)).toBeVisible();
});

test('the sentence names the prompt-cache cost of rotation under round-robin', async () => {
  const screen = await renderDrawer(onTheRouter, { gateway: pooledGateway('round-robin') });

  await expect.element(screen.getByText(/prompt cache/)).toBeVisible();
});

test('the failover child list reads as a ladder, every row carrying its printed rank', async () => {
  const screen = await renderDrawer(onTheRouter, { gateway: pooledGateway('failover') });

  await expect.element(screen.getByRole('list', { name: 'Children' })).toBeVisible();
  expect(
    [...screen.container.querySelectorAll('[data-rank]')].map((cell) => cell.textContent),
  ).toEqual(['1', '2']);
});

test('a round-robin child list stands unordered, so no row claims an end that wins', async () => {
  const screen = await renderDrawer(onTheRouter, { gateway: pooledGateway('round-robin') });

  await expect.element(screen.getByRole('list', { name: 'Children' })).toBeVisible();
  expect(screen.container.querySelectorAll('[data-rank]')).toHaveLength(0);
});

test('every child reads as the account behind it and the real model it serves', async () => {
  const screen = await renderDrawer(onTheRouter, { gateway: pooledGateway('failover') });

  await expect.element(screen.getByText('claude-haiku-4-5')).toBeVisible();
  await expect.element(screen.getByText('openai/gpt-5')).toBeVisible();
});

const twoKeys = { gateway: oneProviderPool, accounts: twoKeysOneProvider };

test('two children on two accounts of one provider read as two rows a person tells apart', async () => {
  const screen = await renderDrawer(onTheRouter, twoKeys);

  await expect.element(screen.getByRole('list', { name: 'Children' })).toBeVisible();
  expect(
    [...screen.container.querySelectorAll('[data-child-name]')].map((cell) => cell.textContent),
  ).toEqual(['work', 'spare']);
});

test('each move control names the child it carries, so two of one provider never share one', async () => {
  const screen = await renderDrawer(onTheRouter, twoKeys);

  await expect.element(screen.getByRole('button', { name: 'Move work down' })).toBeVisible();
  await expect.element(screen.getByRole('button', { name: 'Move spare up' })).toBeVisible();
});

test('the router subject offers the drawer link into removal that every other subject has', async () => {
  const asked: string[] = [];
  const screen = await renderDrawer(onTheRouter, {
    gateway: pooledGateway('failover'),
    onAskRemoval: (nodeId) => {
      asked.push(nodeId);
    },
  });

  await userEvent.click(screen.getByRole('button', { name: 'Delete router' }));

  expect(asked).toEqual(['route:pooled']);
});

test('the drawer link on a nested router names that router rather than the one above it', async () => {
  const asked: string[] = [];
  const screen = await renderDrawer(
    { kind: 'router', modelId: 'pooled', routeNodeId: 'r2' },
    {
      gateway: nestedGateway,
      onAskRemoval: (nodeId) => {
        asked.push(nodeId);
      },
    },
  );

  await userEvent.click(screen.getByRole('button', { name: 'Delete router' }));

  expect(asked).toEqual(['route:pooled:r2']);
});

test('a router subject naming a virtual model the gateway no longer holds reads the gateway', async () => {
  const screen = await renderDrawer(
    { kind: 'router', modelId: 'gone', routeNodeId: undefined },
    { gateway: pooledGateway('failover') },
  );

  await expect.element(screen.getByText('Endpoint', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('Router', { exact: true })).not.toBeInTheDocument();
});

test('a router subject seated where a target now stands reads the gateway', async () => {
  const screen = await renderDrawer(
    { kind: 'router', modelId: 'pooled', routeNodeId: 't1' },
    { gateway: pooledGateway('failover') },
  );

  await expect.element(screen.getByText('Endpoint', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('Router', { exact: true })).not.toBeInTheDocument();
});

test('a refused rename keeps the name a person typed and says why it did not land', async () => {
  const screen = await renderDrawer(onTheRouter, { gateway: pooledGateway('failover') });

  refusingEveryRewrite(pooledGateway('failover'));

  await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
  await screen.getByRole('textbox', { name: 'Router name' }).fill('Ladder');
  await userEvent.click(screen.getByRole('button', { name: 'Save' }));

  await expect
    .element(screen.getByRole('alert'))
    .toHaveTextContent('the gateway file could not be written');
  await expect.element(screen.getByRole('textbox', { name: 'Router name' })).toHaveValue('Ladder');
});

test('a router holding no child says so rather than standing an empty ladder', async () => {
  const empty = gatewaySeed({
    slug: 'my-gateway',
    displayName: 'My Gateway',
    port: 8397,
    virtualModels: [
      {
        id: 'pooled',
        displayName: 'Pooled',
        routing: {
          entry: 'r1',
          nodes: { r1: { kind: 'router', policy: { mode: 'failover' }, children: [] } },
        },
      },
    ],
  });
  const screen = await renderDrawer(onTheRouter, { gateway: empty });

  await expect.element(screen.getByText(/no child yet/)).toBeVisible();
});
