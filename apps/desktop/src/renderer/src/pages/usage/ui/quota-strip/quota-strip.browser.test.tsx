import type { QuotaWindow } from '@recompose/contracts';

import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { QuotaStrip } from './quota-strip';

const NOW = 1_755_000_000_000;
const HOUR_MS = 3_600_000;

const fiveHour: QuotaWindow = {
  accountId: 'work',
  provider: 'anthropic',
  length: '5h',
  openedAt: NOW - 2 * HOUR_MS,
  closesAt: NOW + 3 * HOUR_MS,
  burnTokens: 1_200_000,
  record: { burnTokens: 2_000_000, openedAt: 1_754_179_200_000 },
};

const weekly: QuotaWindow = {
  accountId: 'work',
  provider: 'anthropic',
  length: 'week',
  burnTokens: 9_400_000,
};

const named = (accountId: string) => (accountId === 'work' ? 'Work seat' : accountId);

test('the five-hour gauge draws burn on a fixed track with the record marked and dated', async () => {
  const screen = await render(
    <QuotaStrip accountNameOf={named} now={NOW} windows={[fiveHour, weekly]} />,
  );

  const gauge = screen.getByRole('meter', { name: /Work seat.*5-hour/ });

  await expect.element(gauge).toBeInTheDocument();

  const filled = Number(gauge.element().getAttribute('aria-valuenow'));

  expect(filled).toBeGreaterThan(0.5);
  expect(filled).toBeLessThan(0.6);
  await expect.element(screen.getByText(/record ~2\.0M on Aug 3/)).toBeVisible();
  await expect.element(screen.getByText(/~1\.2M tokens/)).toBeVisible();
});

test('the reset countdown carries the approximation prefix', async () => {
  const screen = await render(<QuotaStrip accountNameOf={named} now={NOW} windows={[fiveHour]} />);

  await expect.element(screen.getByText(/~3h until reset/)).toBeVisible();
});

test('a record window says so instead of claiming exhaustion', async () => {
  const busiest: QuotaWindow = { ...fiveHour, burnTokens: 2_400_000 };
  const screen = await render(<QuotaStrip accountNameOf={named} now={NOW} windows={[busiest]} />);

  await expect.element(screen.getByText(/busiest on record/)).toBeVisible();

  const gauge = screen.getByRole('meter', { name: /Work seat.*5-hour/ });
  const filled = Number(gauge.element().getAttribute('aria-valuenow'));

  expect(filled).toBeLessThan(1);
});

test('the weekly gauge shows burn without a countdown', async () => {
  const screen = await render(<QuotaStrip accountNameOf={named} now={NOW} windows={[weekly]} />);

  await expect
    .element(screen.getByRole('meter', { name: /Work seat.*weekly/i }))
    .toBeInTheDocument();
  await expect.element(screen.getByText(/~9\.4M tokens/)).toBeVisible();
  expect(screen.container.textContent).not.toContain('until reset');
});

test('every figure names its derivation and no copy claims an official quota', async () => {
  const screen = await render(
    <QuotaStrip accountNameOf={named} now={NOW} windows={[fiveHour, weekly]} />,
  );

  await expect
    .element(screen.getByText(/Derived from local logs on UTC hour boundaries/))
    .toBeVisible();
  expect(screen.container.textContent).not.toMatch(/remaining quota/i);
});
