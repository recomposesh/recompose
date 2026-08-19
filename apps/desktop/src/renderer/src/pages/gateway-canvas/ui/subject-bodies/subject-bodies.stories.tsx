import { targetTheEntryNames } from '@recompose/contracts';
import { expect, fn } from 'storybook/test';

import preview from '#.storybook/preview';

import { servedModels } from '../../model/served-models';
import {
  servingBridgeWorld,
  servingGateway,
  storedAccounts,
  workKey,
} from '../../testing/gateway-canvas.testkit';
import { pooledGateway } from '../../testing/routed-gateways.testkit';
import { framedAsDrawerPanel } from '../../testing/subject-shell.testkit';
import { gatewayBody, ghostBody, routerBody, targetBody } from './subject-bodies';

const asked = fn<() => void>();

function GatewaySubjectUnderProof() {
  return framedAsDrawerPanel(
    gatewayBody(
      servingGateway,
      servedModels(servingGateway.virtualModels, storedAccounts.accounts),
      'running',
      '127.0.0.1',
      asked,
    ),
  );
}

function TargetSubjectUnderProof() {
  return framedAsDrawerPanel(
    targetBody(
      workKey,
      [],
      servingGateway.virtualModels.filter(
        (model) => targetTheEntryNames(model.routing)?.accountId === workKey.id,
      ),
      asked,
    ),
  );
}

function GhostSubjectUnderProof() {
  return framedAsDrawerPanel(ghostBody('gone'));
}

const pooled = pooledGateway.virtualModels[0];

const pooledRouter = pooled?.routing.nodes['r1'];

function RouterSubjectUnderProof() {
  if (pooled === undefined || pooledRouter?.kind !== 'router') {
    throw new Error('the pooled fixture stands no router at its entry');
  }

  return framedAsDrawerPanel(
    routerBody(pooledGateway, pooled, 'r1', pooledRouter, storedAccounts.accounts, {
      onDelete: asked,
      onSelectNode: () => {},
    }),
  );
}

const meta = preview.meta({
  component: GatewaySubjectUnderProof,
  parameters: { bridge: servingBridgeWorld },
});

/**
 * The gateway subject's body: its own facts, the endpoint, and what serves.
 *
 * @summary Every subject body composes the same shell, so the drawer only decides which body
 * stands and never how a subject's parts are laid out.
 */
export const TheGatewaySubject = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Endpoint', { exact: true })).toBeVisible();
    await expect(await canvas.findByText('http://127.0.0.1:8397')).toBeVisible();
    await expect(await canvas.findByRole('button', { name: 'Delete gateway' })).toBeVisible();
  },
});

/** The gateway's front door stands between its own facts and the address it answers on. */
export const TheGatewaySubjectCarriesAccess = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Access', { exact: true })).toBeVisible();
    await expect(await canvas.findByRole('switch', { name: /API key/ })).toBeVisible();
  },
});

/** The target subject's body: the stored account, and the definitions behind it. */
export const TheTargetSubject = meta.story({
  render: () => <TargetSubjectUnderProof />,
  play: async ({ canvas }) => {
    await expect((await canvas.findAllByText('API key', { exact: true }))[0]).toBeVisible();
    await expect(await canvas.findByText('Serves', { exact: true })).toBeVisible();
    await expect(await canvas.findByText('Fast', { exact: true })).toBeVisible();
  },
});

/**
 * The router subject's body: the mode, the children, and the way off the canvas.
 *
 * @summary A router is a card a person put here, so it offers the deletion footer every other card
 * subject offers rather than leaving the Delete key as the only way to take one back.
 */
export const TheRouterSubject = meta.story({
  render: () => <RouterSubjectUnderProof />,
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Mode', { exact: true })).toBeVisible();
    await expect(await canvas.findByRole('list', { name: 'Children' })).toBeVisible();
    await expect(await canvas.findByRole('button', { name: 'Delete router' })).toBeVisible();
  },
});

/** The removed subject's body: the gap a departed account left behind. */
export const TheRemovedSubject = meta.story({
  render: () => <GhostSubjectUnderProof />,
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { name: 'gone' })).toBeVisible();
    await expect(await canvas.findByText(/cable gesture repairs it/)).toBeVisible();
  },
});
