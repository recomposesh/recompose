import type { AccountsDocument, GatewayConfig } from '@recompose/contracts';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense } from 'react';
import { beforeEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';

import type { SettledDefinition } from '../../lib/model-draft';
import type { InspectorSubject } from './gateway-drawer';

import { installFakeBridge } from '../../../../shared/testing';
import { emptyDefinition } from '../../lib/model-draft';
import { heldDraft, leaveDrafting, startDrafting } from '../../lib/use-held-draft';
import {
  accountsWithout,
  freshGateway,
  listedModels,
  runningGateway,
  servingGateway,
  storedAccounts,
} from '../../testing/gateway-canvas.testkit';
import { GatewayDrawer } from './gateway-drawer';

vi.setConfig({ testTimeout: 40_000 });

beforeEach(() => {
  leaveDrafting('my-gateway');
});

type DrawerWorld = {
  accounts?: AccountsDocument;
  gateway?: GatewayConfig;
  refusal?: string;
  onDraftDefined?: (definition: SettledDefinition) => void;
};

async function renderDrawer(subject: InspectorSubject, world: DrawerWorld = {}) {
  const gateway = world.gateway ?? servingGateway;

  installFakeBridge({
    accounts: world.accounts ?? storedAccounts,
    gateways: [gateway],
    engineStates: runningGateway,
    providerModels: listedModels,
  });

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<p>Loading…</p>}>
        <GatewayDrawer
          gateway={gateway}
          onDraftDefined={world.onDraftDefined ?? (() => {})}
          refusal={world.refusal}
          subject={subject}
        />
      </Suspense>
    </QueryClientProvider>,
  );
}

test('the gateway subject reads the endpoint and what serves, with no add button', async () => {
  const screen = await renderDrawer({ kind: 'gateway' });

  await expect.element(screen.getByText('Endpoint', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('fast → work · claude-haiku-4-5')).toBeVisible();
  await expect
    .element(screen.getByRole('button', { name: 'Add virtual model' }))
    .not.toBeInTheDocument();
});

test('a gateway serving nothing points at the cable rather than at a button', async () => {
  const screen = await renderDrawer({ kind: 'gateway' }, { gateway: freshGateway });

  await expect.element(screen.getByText('Nothing serves yet')).toBeVisible();
  await expect.element(screen.getByText(/cable from the gateway/)).toBeVisible();
  await expect
    .element(screen.getByRole('button', { name: 'Add virtual model' }))
    .not.toBeInTheDocument();
});

test('the virtual model subject spells its target out as a name, a provider, and a kind', async () => {
  const screen = await renderDrawer({ kind: 'virtual-model', modelId: 'fast' });

  await expect.element(screen.getByText('Virtual model', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('Target', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('work', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('Provider', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('anthropic', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('Kind', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('API Keys', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('claude-haiku-4-5', { exact: true })).toBeVisible();
});

test('the cable subject reads both ends of the binding', async () => {
  const screen = await renderDrawer({ kind: 'cable', modelId: 'creative' });

  await expect.element(screen.getByText('Binding', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('openrouter', { exact: true }).first()).toBeVisible();
  await expect.element(screen.getByText('Aggregators', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('openai/gpt-5', { exact: true })).toBeVisible();
});

test('the target subject reads the account behind it', async () => {
  const screen = await renderDrawer({ kind: 'target', accountId: 'k1' });

  await expect.element(screen.getByText('Target', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('anthropic', { exact: true }).first()).toBeVisible();
  await expect.element(screen.getByText('API Keys', { exact: true })).toBeVisible();
});

test('a virtual model whose account left the registry reads that bare account id as its target', async () => {
  const screen = await renderDrawer(
    { kind: 'virtual-model', modelId: 'creative' },
    { accounts: accountsWithout('g1') },
  );

  await expect.element(screen.getByText('Virtual model', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('g1', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('Provider', { exact: true })).not.toBeInTheDocument();
  await expect.element(screen.getByText('Kind', { exact: true })).not.toBeInTheDocument();
});

test('a subject naming a virtual model the gateway no longer holds reads the gateway', async () => {
  const screen = await renderDrawer({ kind: 'virtual-model', modelId: 'gone' });

  await expect.element(screen.getByText('Endpoint', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('Virtual model', { exact: true })).not.toBeInTheDocument();
});

test('a subject naming a target the registry no longer holds reads the gateway', async () => {
  const screen = await renderDrawer({ kind: 'target', accountId: 'gone' });

  await expect.element(screen.getByText('Endpoint', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('Target', { exact: true })).not.toBeInTheDocument();
});

test('a removed target says where the account went', async () => {
  const screen = await renderDrawer({ kind: 'ghost-target', accountId: 'gone' });

  await expect.element(screen.getByText('Removed', { exact: true })).toBeVisible();
  await expect.element(screen.getByText(/left the registry/)).toBeVisible();
});

test('the draft subject edits the held draft as a person types', async () => {
  startDrafting('my-gateway', emptyDefinition(), { x: 320, y: 140 });

  const screen = await renderDrawer({ kind: 'draft' });

  await screen.getByRole('textbox', { name: 'Name' }).fill('Steady');

  expect(heldDraft('my-gateway')?.definition.displayName).toBe('Steady');
  expect(heldDraft('my-gateway')?.definition.id).toBe('steady');
});

test('a settled draft saves through the inspector and hands the definition over', async () => {
  startDrafting('my-gateway', emptyDefinition(), { x: 320, y: 140 });

  const defined: string[] = [];
  const screen = await renderDrawer(
    { kind: 'draft' },
    {
      onDraftDefined: (definition) => {
        defined.push(definition.id);
      },
    },
  );

  await screen.getByRole('textbox', { name: 'Name' }).fill('Steady');
  await userEvent.click(screen.getByRole('button', { name: 'work' }));
  await userEvent.click(screen.getByRole('button', { name: 'claude-opus-5' }));
  await userEvent.click(screen.getByRole('button', { name: 'Add virtual model' }));

  await expect.poll(() => defined).toEqual(['steady']);
});

test('a refusal sentence stands in the inspector as an alert', async () => {
  const screen = await renderDrawer(
    { kind: 'gateway' },
    { refusal: 'recompose cannot store this virtual model as it stands.' },
  );

  await expect
    .element(screen.getByRole('alert'))
    .toHaveTextContent('recompose cannot store this virtual model as it stands.');
});
