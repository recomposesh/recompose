import type { AccountsDocument } from '@recompose/contracts';

import { expect, test, vi } from 'vitest';

import { gatewaySeed, noAccounts } from '../../shared/testing';
import { renderAt } from '../testing/render-app';

vi.setConfig({ testTimeout: 40_000 });

const codex = gatewaySeed({ slug: 'codex', displayName: 'Codex', port: 51234 });

async function openTheDraftFields(accounts: AccountsDocument) {
  const screen = await renderAt('/gateways/codex', { accounts, gateways: [codex] });

  await expect.element(screen.getByLabelText('Add a virtual model')).toBeVisible();
  await screen.getByLabelText('Add a virtual model').click();

  return screen;
}

test('with nothing stored that can serve, the target says so instead of offering nothing', async () => {
  const screen = await openTheDraftFields(noAccounts);

  await expect.element(screen.getByText('No provider connected yet')).toBeVisible();
  await expect.element(screen.getByRole('link', { name: 'Open Providers' })).toBeVisible();
  await expect
    .element(screen.getByRole('searchbox', { name: 'Search providers' }))
    .not.toBeInTheDocument();
});

test('the way out of the empty target reaches the screen that connects one', async () => {
  const screen = await openTheDraftFields(noAccounts);

  await screen.getByRole('link', { name: 'Open Providers' }).click();

  await expect.element(screen.getByRole('heading', { name: 'API Keys' })).toBeVisible();
});
