import type { AccountBalance } from '@recompose/contracts';

import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { BalanceCard } from './balance-card';

const NOW = 1_755_000_000_000;
const MINUTE_MS = 60_000;

const goodRead: AccountBalance = {
  accountId: 'build',
  reading: { totalCredits: 25, totalUsage: 12.66, readAt: NOW - 2 * MINUTE_MS },
};

const failedRead: AccountBalance = {
  accountId: 'build',
  reading: { totalCredits: 25, totalUsage: 12.66, readAt: NOW - 40 * MINUTE_MS },
  failure: 'OpenRouter could not be reached.',
};

const named = (accountId: string) => (accountId === 'build' ? 'build' : accountId);

test('the credits card stamps when it read', async () => {
  const screen = await render(
    <BalanceCard accountNameOf={named} balances={[goodRead]} now={NOW} onRefresh={() => {}} />,
  );

  await expect.element(screen.getByText('build')).toBeVisible();
  await expect.element(screen.getByText('$12.34')).toBeVisible();
  await expect.element(screen.getByText(/read ~2m ago/)).toBeVisible();
});

test('a failed refresh keeps the last reading beside the failure', async () => {
  const screen = await render(
    <BalanceCard accountNameOf={named} balances={[failedRead]} now={NOW} onRefresh={() => {}} />,
  );

  await expect.element(screen.getByText('$12.34')).toBeVisible();
  await expect.element(screen.getByText(/read ~40m ago/)).toBeVisible();
  await expect.element(screen.getByText('OpenRouter could not be reached.')).toBeVisible();
});

test('the refresh act asks for a fresh read', async () => {
  const onRefresh = vi.fn<() => void>();
  const screen = await render(
    <BalanceCard accountNameOf={named} balances={[goodRead]} now={NOW} onRefresh={onRefresh} />,
  );

  await screen.getByRole('button', { name: /Refresh/ }).click();

  expect(onRefresh).toHaveBeenCalledTimes(1);
});

test('a fresh read says just now, and an old one counts hours', async () => {
  const fresh: AccountBalance = {
    accountId: 'build',
    reading: { totalCredits: 25, totalUsage: 12.66, readAt: NOW - 10_000 },
  };
  const old: AccountBalance = {
    accountId: 'spare',
    reading: { totalCredits: 5, totalUsage: 1, readAt: NOW - 3 * 60 * MINUTE_MS },
  };
  const screen = await render(
    <BalanceCard accountNameOf={named} balances={[fresh, old]} now={NOW} onRefresh={() => {}} />,
  );

  await expect.element(screen.getByText(/read just now/)).toBeVisible();
  await expect.element(screen.getByText(/read ~3h ago/)).toBeVisible();
});

test('an account that never answered shows its failure without inventing a reading', async () => {
  const neverRead: AccountBalance = {
    accountId: 'build',
    failure: 'OpenRouter could not be reached.',
  };
  const screen = await render(
    <BalanceCard accountNameOf={named} balances={[neverRead]} now={NOW} onRefresh={() => {}} />,
  );

  await expect.element(screen.getByText('OpenRouter could not be reached.')).toBeVisible();
  expect(screen.container.textContent).not.toContain('$');
});

test('no aggregator account means no card at all', async () => {
  const screen = await render(
    <BalanceCard accountNameOf={named} balances={[]} now={NOW} onRefresh={() => {}} />,
  );

  expect(screen.container.textContent).toBe('');
});
