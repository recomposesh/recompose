import type { AccountsDocument } from '@recompose/contracts';

import { ACCOUNTS_VERSION, defaultSettings } from '@recompose/contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import type { BridgeParameters } from '../../../../shared/testing';

import {
  accountsQueryOptions,
  bindSettingsToCache,
  gatewaysQueryOptions,
  settingsQueryOptions,
} from '../../../../shared/api';
import { emitSettingsChanged, gatewaySeed, installFakeBridge } from '../../../../shared/testing';
import { GetStartedPanel } from './get-started-panel';

const codex = gatewaySeed({ slug: 'codex', displayName: 'Codex', port: 51234 });

const composedGateway = gatewaySeed({
  slug: 'codex',
  displayName: 'Codex',
  port: 51234,
  virtualModels: [
    {
      id: 'fast',
      displayName: 'Fast',
      routing: {
        entry: 't1',
        nodes: { t1: { kind: 'target', accountId: 'k1', providerModel: 'sonnet' } },
      },
    },
  ],
});

const oneConnectedAccount: AccountsDocument = {
  schemaVersion: ACCOUNTS_VERSION,
  accounts: [
    { id: 'k1', provider: 'anthropic', kind: 'api-key', label: 'work', credentialRef: 'c1' },
  ],
};

async function renderPanel(parameters: BridgeParameters = {}) {
  installFakeBridge(parameters);

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  await Promise.all([
    queryClient.ensureQueryData(gatewaysQueryOptions),
    queryClient.ensureQueryData(accountsQueryOptions),
    queryClient.ensureQueryData(settingsQueryOptions),
  ]);
  bindSettingsToCache(queryClient);

  return render(
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<p>Loading…</p>}>
        <GetStartedPanel />
      </Suspense>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

test('the checklist names all four steps of a first session', async () => {
  const screen = await renderPanel();

  await expect.element(screen.getByText('Create a gateway')).toBeVisible();
  await expect.element(screen.getByText('Connect a provider')).toBeVisible();
  await expect.element(screen.getByText('Compose a virtual model')).toBeVisible();
  await expect.element(screen.getByText('Send the first request')).toBeVisible();
});

test('the checklist stands on the step the session has reached', async () => {
  const screen = await renderPanel({ gateways: [codex] });

  await expect
    .element(screen.getByText('Connect a provider'))
    .toHaveAttribute('aria-current', 'step');
});

test('a served request completes the last step without a record of its own', async () => {
  const screen = await renderPanel({
    gateways: [codex],
    settings: { ...defaultSettings(), firstRequestServed: true },
  });

  await expect.element(screen.getByText('2 of 4')).toBeVisible();
});

test('folding the checklist keeps its header and its progress and drops the rest', async () => {
  const screen = await renderPanel({ gateways: [codex] });

  await screen.getByRole('button', { name: 'Get started' }).click();

  await expect.element(screen.getByRole('heading', { name: 'Get started' })).toBeVisible();
  await expect.element(screen.getByText('1 of 4')).toBeVisible();
  await expect.element(screen.getByText('Create a gateway')).not.toBeVisible();
  await expect.element(screen.getByRole('button', { name: 'Skip setup' })).not.toBeInTheDocument();
});

test('the fold reports itself, so the header says whether the steps are showing', async () => {
  const screen = await renderPanel();

  const header = screen.getByRole('button', { name: 'Get started' });

  await expect.element(header).toHaveAttribute('aria-expanded', 'true');

  await header.click();

  await expect.element(header).toHaveAttribute('aria-expanded', 'false');
});

test('a checklist folded away comes back folded on the next session', async () => {
  const first = await renderPanel({ gateways: [codex] });

  await first.getByRole('button', { name: 'Get started' }).click();

  await expect.element(first.getByText('Create a gateway')).not.toBeVisible();

  await first.unmount();

  const second = await renderPanel({ gateways: [codex] });

  await expect.element(second.getByRole('heading', { name: 'Get started' })).toBeVisible();
  await expect.element(second.getByText('Create a gateway')).not.toBeVisible();
});

test('opening a folded checklist brings its steps back for good', async () => {
  const first = await renderPanel({ gateways: [codex] });
  const header = first.getByRole('button', { name: 'Get started' });

  await header.click();
  await header.click();

  await expect.element(first.getByText('Create a gateway')).toBeVisible();

  await first.unmount();

  const second = await renderPanel({ gateways: [codex] });

  await expect.element(second.getByText('Create a gateway')).toBeVisible();
});

test('skipping the setup takes the whole checklist away by storing the choice', async () => {
  const screen = await renderPanel({ gateways: [codex] });

  await screen.getByRole('button', { name: 'Skip setup' }).click();

  await expect
    .element(screen.getByRole('heading', { name: 'Get started' }))
    .not.toBeInTheDocument();
});

test('a stored skip keeps the checklist away on the next session', async () => {
  const screen = await renderPanel({
    gateways: [codex],
    settings: { ...defaultSettings(), showOnboardingChecklist: false },
  });

  await expect
    .element(screen.getByRole('heading', { name: 'Get started' }))
    .not.toBeInTheDocument();
});

test('finishing the last step celebrates, leaves, then stores the hidden checklist', async () => {
  const screen = await renderPanel({
    gateways: [composedGateway],
    accounts: oneConnectedAccount,
  });
  const saveSettings = vi.spyOn(window.recompose, 'settings:save');

  await expect.element(screen.getByText('3 of 4')).toBeVisible();

  emitSettingsChanged({ ...defaultSettings(), firstRequestServed: true });

  await expect
    .poll(() => screen.container.querySelectorAll('.confetti-piece').length)
    .toBeGreaterThan(0);
  expect(saveSettings).not.toHaveBeenCalled();
  await expect
    .poll(() => screen.container.querySelector('[data-get-started-panel]'), { timeout: 3_000 })
    .toBeNull();
  await expect
    .element(screen.getByRole('heading', { name: 'Get started' }))
    .not.toBeInTheDocument();
  await expect.poll(() => saveSettings.mock.calls.length).toBe(1);
  expect(saveSettings).toHaveBeenCalledWith({ showOnboardingChecklist: false });
});

test('a checklist reopened after completion stands still rather than vanishing again', async () => {
  const screen = await renderPanel({
    gateways: [composedGateway],
    accounts: oneConnectedAccount,
    settings: { ...defaultSettings(), firstRequestServed: true },
  });

  await expect.element(screen.getByText('4 of 4')).toBeVisible();

  await new Promise((rest) => {
    setTimeout(rest, 1600);
  });

  await expect.element(screen.getByRole('heading', { name: 'Get started' })).toBeVisible();
  expect(screen.container.querySelectorAll('.confetti-piece')).toHaveLength(0);
});

test('a settings push from outside the window brings the checklist back', async () => {
  const screen = await renderPanel({
    gateways: [codex],
    settings: { ...defaultSettings(), showOnboardingChecklist: false },
  });

  emitSettingsChanged({ ...defaultSettings(), showOnboardingChecklist: true });

  await expect.element(screen.getByRole('heading', { name: 'Get started' })).toBeVisible();
});
