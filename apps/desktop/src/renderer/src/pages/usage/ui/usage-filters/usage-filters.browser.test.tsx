import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import type { UsageSearch } from '../../lib/usage-search';

import { installFakeBridge, refusedReport, servedReport } from '../../../../shared/testing';
import { UsageFilters } from './usage-filters';

const at7d: UsageSearch = { range: '7d', metric: 'requests', stackedBy: 'gateway' };

async function mounted(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

test('picking a member narrows the address to it', async () => {
  const onSearchChange = vi.fn<(next: UsageSearch) => void>();

  installFakeBridge({ usageReport: servedReport });

  const screen = await mounted(<UsageFilters onSearchChange={onSearchChange} search={at7d} />);

  await screen.getByRole('button', { name: /Gateways/ }).click();
  await screen.getByRole('checkbox', { name: 'relay' }).click();

  expect(onSearchChange).toHaveBeenCalledWith({ ...at7d, gateways: ['relay'] });
});

test('letting the last member go drops the filter from the address', async () => {
  const onSearchChange = vi.fn<(next: UsageSearch) => void>();

  installFakeBridge({ usageReport: servedReport });

  const screen = await mounted(
    <UsageFilters onSearchChange={onSearchChange} search={{ ...at7d, gateways: ['relay'] }} />,
  );

  await screen.getByRole('button', { name: /Gateways/ }).click();
  await screen.getByRole('checkbox', { name: 'relay' }).click();

  expect(onSearchChange).toHaveBeenCalledWith(at7d);
});

test('the provider filter narrows by the account a person connected', async () => {
  const onSearchChange = vi.fn<(next: UsageSearch) => void>();

  installFakeBridge({ usageReport: servedReport });

  const screen = await mounted(<UsageFilters onSearchChange={onSearchChange} search={at7d} />);

  await screen.getByRole('button', { name: /Providers/ }).click();
  await screen.getByRole('checkbox', { name: 'work' }).click();

  expect(onSearchChange).toHaveBeenCalledWith({ ...at7d, providers: ['work'] });
});

test('the provider filter names the traffic that reached no account', async () => {
  const onSearchChange = vi.fn<(next: UsageSearch) => void>();

  installFakeBridge({ usageReport: refusedReport });

  const screen = await mounted(<UsageFilters onSearchChange={onSearchChange} search={at7d} />);

  await screen.getByRole('button', { name: /Providers/ }).click();
  await screen.getByRole('checkbox', { name: 'No account reached' }).click();

  expect(onSearchChange).toHaveBeenCalledWith({ ...at7d, providers: ['(none)'] });
});
