import type { ReactNode } from 'react';

import { expect, fn } from 'storybook/test';

import preview from '#.storybook/preview';

import { servedModels } from '../../model/served-models';
import {
  servingBridgeWorld,
  servingGateway,
  storedAccounts,
  workKey,
} from '../../testing/gateway-canvas.testkit';
import { gatewayBody, ghostBody, targetBody } from './subject-bodies';

const asked = fn<() => void>();

function InspectorFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-end bg-surface-content">
      <aside className="flex h-150 w-80 flex-col overflow-hidden border-s border-line-subtle bg-surface-toolbar">
        {children}
      </aside>
    </div>
  );
}

function GatewaySubjectUnderProof() {
  return (
    <InspectorFrame>
      {gatewayBody(
        servingGateway,
        servedModels(servingGateway.virtualModels, storedAccounts.accounts),
        'running',
        '127.0.0.1',
        asked,
      )}
    </InspectorFrame>
  );
}

function TargetSubjectUnderProof() {
  return (
    <InspectorFrame>
      {targetBody(
        workKey,
        [],
        servingGateway.virtualModels.filter((model) => model.target.accountId === workKey.id),
        asked,
      )}
    </InspectorFrame>
  );
}

function GhostSubjectUnderProof() {
  return <InspectorFrame>{ghostBody('gone')}</InspectorFrame>;
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
    await expect(await canvas.findByRole('button', { name: 'Delete Gateway' })).toBeVisible();
  },
});

/** The target subject's body: the stored account, and the definitions behind it. */
export const TheTargetSubject = meta.story({
  render: () => <TargetSubjectUnderProof />,
  play: async ({ canvas }) => {
    await expect((await canvas.findAllByText('API Key', { exact: true }))[0]).toBeVisible();
    await expect(await canvas.findByText('Behind of', { exact: true })).toBeVisible();
    await expect(await canvas.findByText('Fast', { exact: true })).toBeVisible();
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
