import type { AccountsDocument } from '@recompose/contracts';

import { beforeEach, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import { editDraft, heldDraft, leaveDrafting } from '../../pages/gateway-canvas/testing';
import { gatewaySeed, noAccounts } from '../../shared/testing';
import { renderAt } from '../testing/render-app';

vi.setConfig({ testTimeout: 40_000 });

const codex = gatewaySeed({ slug: 'codex', displayName: 'Codex', port: 51234 });

/**
 * @summary A draft outlives the render that made it, on purpose, so one test's answers would reach
 * the next and a routing step already settled would never be asked about again.
 */
beforeEach(() => {
  leaveDrafting('codex');
});

/**
 * Settles the ask that offers a router or a provider, without pressing through it.
 *
 * @summary These tests are about what the provider step says with nothing stored to offer, so the
 * step before it is answered on the held draft rather than clicked: the click is another surface's
 * subject, and pressing it here only lends this test that surface's flakiness.
 */
function answeredWithAProvider(): void {
  const held = heldDraft('codex')?.definition;

  if (held !== undefined) {
    editDraft('codex', { ...held, bindsThrough: 'target' });
  }
}

async function openTheDraftFields(accounts: AccountsDocument) {
  const screen = await renderAt('/gateways/codex', { accounts, gateways: [codex] });

  await expect.element(screen.getByLabelText('Add a virtual model')).toBeVisible();
  screen.getByLabelText('Add a virtual model').element().focus();
  await userEvent.keyboard('{Enter}');

  answeredWithAProvider();

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

  await expect
    .element(screen.getByRole('heading', { name: 'Subscriptions', level: 1 }))
    .toBeVisible();
});
