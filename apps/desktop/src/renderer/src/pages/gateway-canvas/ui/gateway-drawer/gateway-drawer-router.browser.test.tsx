import type { GatewayConfig } from '@recompose/contracts';

import { expect, test, vi } from 'vitest';

import { gatewaySeed } from '../../../../shared/testing';
import { renderDrawer } from '../../testing/gateway-drawer.testkit';

vi.setConfig({ testTimeout: 40_000 });

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
