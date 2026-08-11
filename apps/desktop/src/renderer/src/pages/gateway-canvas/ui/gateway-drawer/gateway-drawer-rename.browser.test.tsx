import { expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import { installFakeBridge } from '../../../../shared/testing';
import { servingBridgeWorld } from '../../testing/gateway-canvas.testkit';
import { renderDrawer } from '../../testing/gateway-drawer.testkit';

vi.setConfig({ testTimeout: 40_000 });

async function storedDefinitions(): Promise<ReadonlyArray<{ id: string; displayName: string }>> {
  const listed = await window.recompose['gateways:list']();

  if (!listed.ok) {
    throw new Error('the fake bridge refused to list gateways');
  }

  return (listed.value[0]?.virtualModels ?? []).map(({ id, displayName }) => ({ id, displayName }));
}

async function storedGatewayName(): Promise<string | undefined> {
  const listed = await window.recompose['gateways:list']();

  return listed.ok ? listed.value[0]?.displayName : undefined;
}

function refusingEveryRewrite(): void {
  installFakeBridge({
    ...servingBridgeWorld,
    overrides: {
      'gateways:update': async () =>
        Promise.resolve({
          ok: false,
          error: { code: 'storage-failed', message: 'the gateway file could not be written' },
        }),
    },
  });
}

test('Edit opens the definition with its stored name and id ready to rewrite', async () => {
  const screen = await renderDrawer({ kind: 'virtual-model', modelId: 'fast' });

  await userEvent.click(screen.getByRole('button', { name: 'Edit' }));

  await expect.element(screen.getByRole('textbox', { name: 'Model name' })).toHaveValue('Fast');
  await expect.element(screen.getByRole('textbox', { name: 'Model id' })).toHaveValue('fast');
});

test('cancelling the rename keeps every stored word', async () => {
  const screen = await renderDrawer({ kind: 'virtual-model', modelId: 'fast' });

  await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
  await screen.getByRole('textbox', { name: 'Model name' }).fill('Rapid');
  await screen.getByRole('textbox', { name: 'Model id' }).fill('rapid');
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

  await expect.element(screen.getByRole('textbox', { name: 'Model name' })).not.toBeInTheDocument();
  await expect.element(screen.getByText('fast', { exact: true })).toBeVisible();
  expect(await storedDefinitions()).toContainEqual({ id: 'fast', displayName: 'Fast' });
});

test('a rename onto an id another definition holds refuses before anything writes', async () => {
  const screen = await renderDrawer({ kind: 'virtual-model', modelId: 'fast' });

  await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
  await screen.getByRole('textbox', { name: 'Model id' }).fill('creative');
  await userEvent.click(screen.getByRole('button', { name: 'Save' }));

  await expect
    .element(screen.getByRole('alert'))
    .toHaveTextContent('"creative" already serves this gateway.');
  await expect.element(screen.getByRole('textbox', { name: 'Model id' })).toHaveValue('creative');
  expect(await storedDefinitions()).toContainEqual({ id: 'fast', displayName: 'Fast' });
});

test('an id outside the model alphabet refuses with the spelling rule', async () => {
  const screen = await renderDrawer({ kind: 'virtual-model', modelId: 'fast' });

  await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
  await screen.getByRole('textbox', { name: 'Model id' }).fill('Fast Model');
  await userEvent.click(screen.getByRole('button', { name: 'Save' }));

  await expect
    .element(screen.getByRole('alert'))
    .toHaveTextContent('A model id is lowercase letters, digits, dots and dashes.');
  expect(await storedDefinitions()).toContainEqual({ id: 'fast', displayName: 'Fast' });
});

test('saving a new name keeps the id and leaves the restart notice standing', async () => {
  const renamed: string[] = [];
  const screen = await renderDrawer(
    { kind: 'virtual-model', modelId: 'fast' },
    {
      onModelRenamed: (modelId) => {
        renamed.push(modelId);
      },
    },
  );

  await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
  await screen.getByRole('textbox', { name: 'Model name' }).fill('Rapid');
  await userEvent.click(screen.getByRole('button', { name: 'Save' }));

  await expect.element(screen.getByText(/Restart the harness/)).toBeVisible();
  expect(await storedDefinitions()).toContainEqual({ id: 'fast', displayName: 'Rapid' });
  expect(renamed).toEqual([]);
});

test('renaming the id hands the settled id over so the selection can follow', async () => {
  const renamed: string[] = [];
  const screen = await renderDrawer(
    { kind: 'virtual-model', modelId: 'fast' },
    {
      onModelRenamed: (modelId) => {
        renamed.push(modelId);
      },
    },
  );

  await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
  await screen.getByRole('textbox', { name: 'Model id' }).fill('rapid');
  await userEvent.click(screen.getByRole('button', { name: 'Save' }));

  await expect.poll(() => renamed).toEqual(['rapid']);
  expect(await storedDefinitions()).toContainEqual({ id: 'rapid', displayName: 'Fast' });
});

test('a rename the store refuses stands in the editor as the refusal', async () => {
  const screen = await renderDrawer({ kind: 'virtual-model', modelId: 'fast' });

  refusingEveryRewrite();

  await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
  await screen.getByRole('textbox', { name: 'Model name' }).fill('Rapid');
  await userEvent.click(screen.getByRole('button', { name: 'Save' }));

  await expect
    .element(screen.getByRole('alert'))
    .toHaveTextContent('the gateway file could not be written');
  await expect.element(screen.getByRole('textbox', { name: 'Model name' })).toHaveValue('Rapid');
});

test('cancelling the gateway rename keeps the stored name', async () => {
  const screen = await renderDrawer({ kind: 'gateway' });

  await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
  await screen.getByRole('textbox', { name: 'Gateway name' }).fill('Louder');
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

  await expect
    .element(screen.getByRole('textbox', { name: 'Gateway name' }))
    .not.toBeInTheDocument();
  await expect.element(screen.getByText('My Gateway', { exact: true }).first()).toBeVisible();
  expect(await storedGatewayName()).toBe('My Gateway');
});

test('saving a gateway name rewrites the stored document and closes the editor', async () => {
  const screen = await renderDrawer({ kind: 'gateway' });

  await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
  await screen.getByRole('textbox', { name: 'Gateway name' }).fill('Renamed Gateway');
  await userEvent.click(screen.getByRole('button', { name: 'Save' }));

  await expect.poll(async () => storedGatewayName()).toBe('Renamed Gateway');
  await expect
    .element(screen.getByRole('textbox', { name: 'Gateway name' }))
    .not.toBeInTheDocument();
});

test('an emptied gateway name refuses, because a gateway needs a name to stand under', async () => {
  const screen = await renderDrawer({ kind: 'gateway' });

  await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
  await screen.getByRole('textbox', { name: 'Gateway name' }).fill('   ');
  await userEvent.click(screen.getByRole('button', { name: 'Save' }));

  await expect
    .element(screen.getByRole('alert'))
    .toHaveTextContent('A gateway needs a name to stand under.');
  await expect.element(screen.getByRole('textbox', { name: 'Gateway name' })).toBeVisible();
  expect(await storedGatewayName()).toBe('My Gateway');
});

test('a gateway rename the store refuses reads its reason under the editor', async () => {
  const screen = await renderDrawer({ kind: 'gateway' });

  refusingEveryRewrite();

  await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
  await screen.getByRole('textbox', { name: 'Gateway name' }).fill('Louder');
  await userEvent.click(screen.getByRole('button', { name: 'Save' }));

  await expect
    .element(screen.getByRole('alert'))
    .toHaveTextContent('the gateway file could not be written');
  await expect.element(screen.getByRole('textbox', { name: 'Gateway name' })).toHaveValue('Louder');
});
