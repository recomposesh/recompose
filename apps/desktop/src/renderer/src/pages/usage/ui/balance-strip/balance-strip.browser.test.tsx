import type { AccountBalance, AccountsDocument, RecomposeIpc } from '@recompose/contracts';
import type { ReactNode } from 'react';

import { ACCOUNTS_VERSION } from '@recompose/contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { installFakeBridge } from '../../../../shared/testing';
import { BalanceStrip } from './balance-strip';

const A_MINUTE = 60_000;

const registry: AccountsDocument = {
  schemaVersion: ACCOUNTS_VERSION,
  accounts: [
    {
      id: 'build',
      kind: 'aggregator',
      provider: 'openrouter',
      label: 'build key',
      credentialRef: 'ref',
    },
  ],
};

function readOf(readAt: number): AccountBalance {
  return { accountId: 'build', reading: { remaining: 37.71, added: 100, spent: 62.29, readAt } };
}

async function mounted(ui: ReactNode, overrides?: Partial<RecomposeIpc>) {
  installFakeBridge({
    accounts: registry,
    balances: [readOf(Date.now() - 3 * A_MINUTE)],
    ...(overrides === undefined ? {} : { overrides }),
  });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

test('the card prints what is left beside the instant the reading was taken', async () => {
  const screen = await mounted(<BalanceStrip />);

  await expect.element(screen.getByText('$37.71')).toBeVisible();
  await expect.element(screen.getByText('Read 3m ago')).toBeVisible();
});

test('the card names the account a person knows rather than its stored id', async () => {
  const screen = await mounted(<BalanceStrip />);

  await expect.element(screen.getByText('build key')).toBeVisible();
});

test('what was added and what was spent both print, so the headline can be checked', async () => {
  const screen = await mounted(<BalanceStrip />);

  await expect.element(screen.getByText('$100.00 added · $62.29 spent')).toBeVisible();
});

test('a failed refresh keeps the last reading and names the failure', async () => {
  const held = readOf(Date.now() - 3 * A_MINUTE);
  const screen = await mounted(<BalanceStrip />, {
    'usage:balances': async ({ refresh }) =>
      Promise.resolve({
        ok: true,
        value: refresh ? [{ ...held, failure: 'OpenRouter could not be reached.' }] : [held],
      }),
  });

  await expect.element(screen.getByText('$37.71')).toBeVisible();

  await screen.getByRole('button', { name: 'Refresh credits' }).click();

  await expect.element(screen.getByText('OpenRouter could not be reached.')).toBeVisible();
  await expect.element(screen.getByText('$37.71')).toBeVisible();
  await expect.element(screen.getByText('Read 3m ago')).toBeVisible();
});

test('a refresh the app itself refused says so rather than failing in silence', async () => {
  const screen = await mounted(<BalanceStrip />, {
    'usage:balances': async ({ refresh }) =>
      refresh
        ? Promise.resolve({
            ok: false,
            error: { code: 'storage-failed', message: 'The credits read could not be started.' },
          })
        : Promise.resolve({ ok: true, value: [readOf(Date.now())] }),
  });

  await expect.element(screen.getByText('$37.71')).toBeVisible();

  await screen.getByRole('button', { name: 'Refresh credits' }).click();

  await expect.element(screen.getByText('The credits read could not be started.')).toBeVisible();
});

test('a read that never landed prints no figure rather than an empty wallet', async () => {
  const screen = await mounted(<BalanceStrip />, {
    'usage:balances': async () =>
      Promise.resolve({
        ok: true,
        value: [{ accountId: 'build', failure: 'OpenRouter could not be reached.' }],
      }),
  });

  await expect.element(screen.getByText('OpenRouter could not be reached.')).toBeVisible();
  await expect.element(screen.getByText('—')).toBeVisible();
});

test('no aggregator account at all keeps the card off the screen entirely', async () => {
  const screen = await mounted(<BalanceStrip />, {
    'usage:balances': async () => Promise.resolve({ ok: true, value: [] }),
  });

  await expect.element(screen.getByText('Credits')).not.toBeInTheDocument();
});
