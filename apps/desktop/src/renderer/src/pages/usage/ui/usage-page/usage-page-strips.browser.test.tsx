import type { AccountBalance, AccountsDocument, QuotaWindow } from '@recompose/contracts';
import type { ReactNode } from 'react';

import { ACCOUNTS_VERSION } from '@recompose/contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import type { UsageSearch } from '../../lib/usage-search';

import { installFakeBridge } from '../../../../shared/testing';
import { UsagePage } from './usage-page';

const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;

const heldAccounts: AccountsDocument = {
  schemaVersion: ACCOUNTS_VERSION,
  accounts: [
    { id: 'claude-sub', provider: 'anthropic', kind: 'subscription', label: 'Personal Claude' },
  ],
};

const claudeWindow: QuotaWindow = {
  accountId: 'claude-sub',
  provider: 'anthropic',
  length: '5h',
  openedAt: Date.now() - HOUR_MS,
  closesAt: Date.now() + 4 * HOUR_MS,
  burnTokens: 1_200_000,
};

const openrouterCredits: AccountBalance = {
  accountId: 'openrouter-main',
  reading: { totalCredits: 25, totalUsage: 5, readAt: Date.now() - 5 * MINUTE_MS },
};

const atLiveHour: UsageSearch = { range: '1h', metric: 'requests' };

async function mounted(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

test('strip rows print the account label the desk holds and the raw id it does not', async () => {
  installFakeBridge({
    accounts: heldAccounts,
    quotaWindows: [claudeWindow],
    balances: [openrouterCredits],
  });

  const screen = await mounted(<UsagePage onSearchChange={() => {}} search={atLiveHour} />);

  await expect.element(screen.getByText('Personal Claude · 5-hour window')).toBeVisible();
  await expect.element(screen.getByText('openrouter-main', { exact: true })).toBeVisible();
});

test('the credits refresh asks upstream for a fresh read', async () => {
  const refreshes: boolean[] = [];

  installFakeBridge({
    balances: [openrouterCredits],
    overrides: {
      'usage:balances': async ({ refresh }) => {
        refreshes.push(refresh);

        return Promise.resolve({ ok: true, value: [openrouterCredits] });
      },
    },
  });

  const screen = await mounted(<UsagePage onSearchChange={() => {}} search={atLiveHour} />);

  await screen.getByRole('button', { name: 'Refresh' }).click();

  await vi.waitFor(() => {
    expect(refreshes).toContain(true);
  });
});
