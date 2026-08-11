import { beforeEach, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import { emptyDefinition } from '../../lib/model-draft';
import { heldDraft, leaveDrafting, startDrafting } from '../../lib/use-held-draft';
import { accountsWithout, freshGateway } from '../../testing/gateway-canvas.testkit';
import { renderDrawer } from '../../testing/gateway-drawer.testkit';

vi.setConfig({ testTimeout: 40_000 });

beforeEach(() => {
  leaveDrafting('my-gateway');
});

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

test('the virtual model subject separates general info from where it goes', async () => {
  const screen = await renderDrawer({ kind: 'virtual-model', modelId: 'fast' });

  await expect.element(screen.getByText('Virtual model', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('General Info', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('Model Name', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('Fast', { exact: true }).first()).toBeVisible();
  await expect.element(screen.getByText('Model id', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('Goes to', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('Target type', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('API Key', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('Provider', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('Anthropic', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('Encrypted key', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('claude-haiku-4-5', { exact: true })).toBeVisible();
});

test('the cable subject reads both ends of the binding', async () => {
  const screen = await renderDrawer({ kind: 'cable', modelId: 'creative' });

  await expect.element(screen.getByText('Binding', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('Aggregator', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('OpenRouter', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('Encrypted key', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('openai/gpt-5', { exact: true })).toBeVisible();
});

test('the target subject reads the account behind it', async () => {
  const screen = await renderDrawer({ kind: 'target', accountId: 'k1', modelId: 'fast' });

  await expect.element(screen.getByText('API Key', { exact: true }).first()).toBeVisible();
  await expect.element(screen.getByText('Anthropic', { exact: true }).last()).toBeVisible();
  await expect.element(screen.getByText('Encrypted key', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('Behind of', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('Model Name', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('Model id', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('Fast', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('fast', { exact: true })).toBeVisible();
});

test.each([
  [{ kind: 'gateway' } as const, 'Delete Gateway', 'gateway'],
  [{ kind: 'virtual-model', modelId: 'fast' } as const, 'Delete Virtual Model', 'model:fast'],
  [{ kind: 'target', accountId: 'k1', modelId: 'fast' } as const, 'Delete Target', 'target:fast'],
])(
  'the drawer deletion link asks through the shared confirmation',
  async (subject, label, nodeId) => {
    const asked: string[] = [];
    const screen = await renderDrawer(subject, {
      onAskRemoval: (askedNodeId) => {
        asked.push(askedNodeId);
      },
    });

    await userEvent.click(screen.getByRole('button', { name: label }));

    expect(asked).toEqual([nodeId]);
  },
);

test('a subscription target reads the signed-in email', async () => {
  const screen = await renderDrawer(
    { kind: 'target', accountId: 's1', modelId: 'fast' },
    {
      subscriptions: [
        {
          id: 's1',
          provider: 'anthropic',
          label: 'Claude',
          signedInAs: 'ada@example.com',
          standing: 'connected',
          active: true,
        },
      ],
    },
  );

  await expect.element(screen.getByText('Subscription', { exact: true }).first()).toBeVisible();
  await expect.element(screen.getByText('Claude', { exact: true }).first()).toBeVisible();
  await expect.element(screen.getByText('Email', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('ada@example.com', { exact: true })).toBeVisible();
});

test('a virtual model whose account left the registry reads that bare account id as its target', async () => {
  const screen = await renderDrawer(
    { kind: 'virtual-model', modelId: 'creative' },
    { accounts: accountsWithout('g1') },
  );

  await expect.element(screen.getByText('Virtual model', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('Goes to', { exact: true })).not.toBeInTheDocument();
  await expect.element(screen.getByText('Provider', { exact: true })).not.toBeInTheDocument();
  await expect.element(screen.getByText('Target type', { exact: true })).not.toBeInTheDocument();
});

test('a subject naming a virtual model the gateway no longer holds reads the gateway', async () => {
  const screen = await renderDrawer({ kind: 'virtual-model', modelId: 'gone' });

  await expect.element(screen.getByText('Endpoint', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('Virtual model', { exact: true })).not.toBeInTheDocument();
});

test('a subject naming a target the registry no longer holds reads the gateway', async () => {
  const screen = await renderDrawer({ kind: 'target', accountId: 'gone', modelId: 'ghosted' });

  await expect.element(screen.getByText('Endpoint', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('Target', { exact: true })).not.toBeInTheDocument();
});

test('a removed target says where the account went', async () => {
  const screen = await renderDrawer({
    kind: 'ghost-target',
    accountId: 'gone',
    modelId: 'creative',
  });

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
