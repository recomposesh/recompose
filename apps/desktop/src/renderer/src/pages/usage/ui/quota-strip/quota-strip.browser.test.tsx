import type { AccountsDocument, QuotaWindow } from '@recompose/contracts';
import type { ReactNode } from 'react';

import { ACCOUNTS_VERSION } from '@recompose/contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { installFakeBridge } from '../../../../shared/testing';
import { QuotaStrip } from './quota-strip';

const AN_HOUR = 3_600_000;
const A_MINUTE = 60_000;
const AUGUST_THIRD = Date.UTC(2026, 7, 3, 9, 0);

const registry: AccountsDocument = {
  schemaVersion: ACCOUNTS_VERSION,
  accounts: [
    {
      id: 'work',
      kind: 'subscription',
      provider: 'anthropic',
      label: 'Claude Max',
      provenance: 'sign-in',
    },
  ],
};

function windowsFor(now: number): readonly QuotaWindow[] {
  return [
    {
      accountId: 'work',
      provider: 'anthropic',
      length: '5h',
      openedAt: now - AN_HOUR,
      closesAt: now + 2 * AN_HOUR + 14 * A_MINUTE,
      burnTokens: 1_200_000,
      record: { burnTokens: 2_000_000, openedAt: AUGUST_THIRD },
    },
    {
      accountId: 'work',
      provider: 'anthropic',
      length: 'week',
      burnTokens: 8_400_000,
      record: { burnTokens: 12_000_000, openedAt: AUGUST_THIRD },
    },
  ];
}

async function mounted(
  ui: ReactNode,
  quotaWindows: readonly QuotaWindow[],
  accounts: AccountsDocument = registry,
) {
  installFakeBridge({ accounts, quotaWindows });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

test('a burn draws against the record, which the gauge hands to assistive tech exactly', async () => {
  const screen = await mounted(<QuotaStrip />, windowsFor(Date.now()));

  const gauge = screen.getByRole('meter', { name: 'Claude · Claude Max 5-hour window burn' });

  await expect.element(screen.getByText('1.2M')).toBeVisible();
  expect(gauge.element().getAttribute('aria-valuenow')).toBe('0.48');
  expect(gauge.element().getAttribute('aria-valuetext')).toBe('48%');
});

test('the strip names local logs as its source and claims no official quota', async () => {
  const screen = await mounted(<QuotaStrip />, windowsFor(Date.now()));

  await expect
    .element(screen.getByText(/this machine's own logs, on UTC hour boundaries/))
    .toBeVisible();
  await expect.element(screen.getByText(/Not an official quota/)).toBeVisible();
});

test('the record prints its figure and day beside the gauge it marks', async () => {
  const screen = await mounted(<QuotaStrip />, windowsFor(Date.now()));

  await expect.element(screen.getByText('Record 2.0M on Aug 3')).toBeVisible();
});

test('the five-hour window carries an approximate countdown to its close', async () => {
  const screen = await mounted(<QuotaStrip />, windowsFor(Date.now()));

  await expect.element(screen.getByText(/Closes in ≈2h 1[34]m/)).toBeVisible();
});

test('the weekly window shows its burn with no countdown beside it', async () => {
  const screen = await mounted(<QuotaStrip />, windowsFor(Date.now()));

  await expect.element(screen.getByText('8.4M')).toBeVisible();
  expect(screen.container.textContent).not.toContain('Weekly window burn closes');
});

test('a window that matched the record says so rather than reading as exhausted', async () => {
  const now = Date.now();
  const matched: readonly QuotaWindow[] = [
    {
      accountId: 'work',
      provider: 'anthropic',
      length: '5h',
      openedAt: now - AN_HOUR,
      closesAt: now + AN_HOUR,
      burnTokens: 2_000_000,
      record: { burnTokens: 2_000_000, openedAt: now - AN_HOUR },
    },
  ];

  const screen = await mounted(<QuotaStrip />, matched);
  const gauge = screen.getByRole('meter', { name: 'Claude · Claude Max 5-hour window burn' });

  await expect.element(screen.getByText('Busiest window on record')).toBeVisible();
  expect(Number(gauge.element().getAttribute('aria-valuenow'))).toBeLessThan(1);
});

test('the card heads with the plan product and keeps the address beneath it', async () => {
  const screen = await mounted(<QuotaStrip />, windowsFor(Date.now()));

  await expect.element(screen.getByText('Claude', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('Claude Max', { exact: true })).toBeVisible();
});

test('two plans on one address read apart by their plan products', async () => {
  const now = Date.now();
  const oneAddress: AccountsDocument = {
    schemaVersion: ACCOUNTS_VERSION,
    accounts: [
      {
        id: 'work',
        kind: 'subscription',
        provider: 'anthropic',
        label: 'dev@example.com',
        provenance: 'sign-in',
      },
      {
        id: 'codex-work',
        kind: 'subscription',
        provider: 'openai',
        label: 'dev@example.com',
        provenance: 'sign-in',
      },
    ],
  };
  const bothBurning: readonly QuotaWindow[] = [
    ...windowsFor(now),
    {
      accountId: 'codex-work',
      provider: 'openai',
      length: '5h',
      openedAt: now - AN_HOUR,
      closesAt: now + AN_HOUR,
      burnTokens: 300_000,
      record: { burnTokens: 500_000, openedAt: AUGUST_THIRD },
    },
  ];

  const screen = await mounted(<QuotaStrip />, bothBurning, oneAddress);

  await expect
    .element(screen.getByRole('meter', { name: 'Claude · dev@example.com 5-hour window burn' }))
    .toBeInTheDocument();
  await expect
    .element(screen.getByRole('meter', { name: 'Codex · dev@example.com 5-hour window burn' }))
    .toBeInTheDocument();
  expect(screen.getByText('dev@example.com').elements()).toHaveLength(2);
});

test('an account nothing has been logged for keeps the strip off the screen entirely', async () => {
  const screen = await mounted(<QuotaStrip />, []);

  await expect.element(screen.getByText('Quota windows')).not.toBeInTheDocument();
});
