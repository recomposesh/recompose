import type { Settings } from '@recompose/contracts';

import { DEFAULT_GATEWAY_BIND_ADDRESS, defaultSettings } from '@recompose/contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense } from 'react';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';

import type { BridgeParameters } from '../../../../shared/testing';

import { unwrapIpcResult } from '../../../../shared/api';
import { installFakeBridge } from '../../../../shared/testing';
import { ServerSection } from './server-section';

async function renderServerSection(parameters: BridgeParameters = {}) {
  installFakeBridge(parameters);

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={null}>
        <ServerSection />
      </Suspense>
    </QueryClientProvider>,
  );
}

const oneRunningGateway: BridgeParameters = {
  engineStates: { codex: { status: 'running' } },
};

async function storedBindAddress(): Promise<string | undefined> {
  const settings = unwrapIpcResult(await window.recompose['settings:get']());

  return settings.bindAddress;
}

function withoutStoredAddress(): Settings {
  const settled = { ...defaultSettings() };

  delete settled.bindAddress;

  return settled;
}

test('the Enter that asks for a restart never answers its own question', async () => {
  const screen = await renderServerSection(oneRunningGateway);
  const field = screen.getByRole('textbox', { name: 'Bind address' });

  await field.fill('0.0.0.0');
  await userEvent.keyboard('{Enter}');

  await expect
    .element(screen.getByRole('heading', { name: 'Restart running gateways?' }))
    .toBeVisible();
  expect(await storedBindAddress()).not.toBe('0.0.0.0');
});

test('cancelling the restart question keeps the stored address in the field', async () => {
  const screen = await renderServerSection(oneRunningGateway);
  const field = screen.getByRole('textbox', { name: 'Bind address' });

  await field.fill('0.0.0.0');
  field.element().blur();

  await expect
    .element(screen.getByRole('heading', { name: 'Restart running gateways?' }))
    .toBeVisible();

  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

  await expect
    .element(screen.getByRole('heading', { name: 'Restart running gateways?' }))
    .not.toBeInTheDocument();
  await expect.element(field).toHaveValue('127.0.0.1');
  expect(await storedBindAddress()).toBe('127.0.0.1');
});

test('an emptied address settles back to the stored one', async () => {
  const screen = await renderServerSection();
  const field = screen.getByRole('textbox', { name: 'Bind address' });

  await field.fill(' ');
  await userEvent.keyboard('{Enter}');

  await expect.element(field).toHaveValue('127.0.0.1');
  expect(await storedBindAddress()).toBe('127.0.0.1');
});

test('retyping the stored address asks for no restart', async () => {
  const screen = await renderServerSection(oneRunningGateway);
  const field = screen.getByRole('textbox', { name: 'Bind address' });

  await field.fill(' 127.0.0.1 ');
  await userEvent.keyboard('{Enter}');

  await expect.element(field).toHaveValue('127.0.0.1');
  await expect
    .element(screen.getByRole('heading', { name: 'Restart running gateways?' }))
    .not.toBeInTheDocument();
  expect(await storedBindAddress()).toBe('127.0.0.1');
});

test('Escape returns the field to the stored address', async () => {
  const screen = await renderServerSection();
  const field = screen.getByRole('textbox', { name: 'Bind address' });

  await field.fill('10.0.0.5');
  await userEvent.keyboard('{Escape}');

  await expect.element(field).toHaveValue('127.0.0.1');
  expect(await storedBindAddress()).toBe('127.0.0.1');
});

test('a settings document holding no address serves the default one', async () => {
  const screen = await renderServerSection({ settings: withoutStoredAddress() });

  await expect
    .element(screen.getByRole('textbox', { name: 'Bind address' }))
    .toHaveValue(DEFAULT_GATEWAY_BIND_ADDRESS);
});
